package com.locality.app.service;

import com.locality.app.dto.*;
import com.locality.app.entity.*;
import com.locality.app.exception.AppException;
import com.locality.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    // ── Rooms ─────────────────────────────────────────────────────────────────

    @Transactional
    public RoomDto getOrCreateDirectRoom(Long userAId, Long userBId) {
        Long lo = Math.min(userAId, userBId);
        Long hi = Math.max(userAId, userBId);
        String roomName = "DM_" + lo + "_" + hi;

        Room room = roomRepository.findByName(roomName).orElseGet(() -> {
            User userA = userRepository.findById(userAId)
                    .orElseThrow(() -> new AppException("User not found"));
            User userB = userRepository.findById(userBId)
                    .orElseThrow(() -> new AppException("User not found"));
            Room newRoom = Room.builder()
                    .name(roomName)
                    .type("DIRECT")
                    .createdBy(userAId)
                    .members(new ArrayList<>(List.of(userA, userB)))
                    .build();
            return roomRepository.save(newRoom);
        });

        return toRoomDto(room, userAId);
    }

    public Room getOrCreateBroadcastRoom() {
        return roomRepository.findByNameAndType("locality-broadcast", "BROADCAST")
                .orElseGet(() -> roomRepository.save(Room.builder()
                        .name("locality-broadcast")
                        .type("BROADCAST")
                        .members(new ArrayList<>())
                        .build()));
    }

    public List<RoomDto> getUserRooms(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("User not found"));
        return roomRepository.findRoomsByMember(user).stream()
                .map(r -> toRoomDto(r, userId))
                .collect(Collectors.toList());
    }

    public RoomDto getRoomById(Long roomId, Long userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException("Room not found"));
        return toRoomDto(room, userId);
    }

    // ── Messages ───────────────────────────────────────────────────────────────

    @Transactional
    public MessageDto saveMessage(Long roomId, Long senderId, String content,
                                  String mediaUrl, String messageType) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException("Room not found"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new AppException("User not found"));

        Message message = Message.builder()
                .room(room)
                .sender(sender)
                .content(content)
                .mediaUrl(mediaUrl)
                .messageType(messageType != null ? messageType : "TEXT")
                .build();

        return toMessageDto(messageRepository.save(message));
    }

    public List<MessageDto> getRoomMessages(Long roomId, int page, int size) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException("Room not found"));
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        return messageRepository.findByRoomOrderByCreatedAtAsc(room, pageable)
                .stream().map(this::toMessageDto).collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long roomId, Long userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException("Room not found"));
        messageRepository.markRoomMessagesAsRead(room, userId);
    }

    // ── Mappers ────────────────────────────────────────────────────────────────

    public MessageDto toMessageDto(Message m) {
        return MessageDto.builder()
                .id(m.getId())
                .roomId(m.getRoom().getId())
                .roomName(m.getRoom().getName())
                .sender(AuthService.toUserDto(m.getSender()))
                .content(m.getContent())
                .mediaUrl(m.getMediaUrl())
                .messageType(m.getMessageType())
                .read(m.isRead())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private RoomDto toRoomDto(Room room, Long currentUserId) {
        // For direct rooms, display the OTHER person's name
        String displayName = room.getName();
        if ("DIRECT".equals(room.getType()) && room.getMembers() != null) {
            displayName = room.getMembers().stream()
                    .filter(u -> !u.getId().equals(currentUserId))
                    .map(User::getName)
                    .findFirst()
                    .orElse(room.getName());
        } else if ("BROADCAST".equals(room.getType())) {
            displayName = "📢 Locality Group";
        }

        long unread = messageRepository.countUnreadMessages(room, currentUserId);

        // Last message
        Pageable lastOne = PageRequest.of(0, 1, Sort.by("createdAt").descending());
        MessageDto lastMessage = messageRepository
                .findByRoomOrderByCreatedAtAsc(room, PageRequest.of(0, 1, Sort.by("createdAt").descending()))
                .stream().map(this::toMessageDto).findFirst().orElse(null);

        List<UserDto> members = room.getMembers() == null ? List.of() :
                room.getMembers().stream().map(AuthService::toUserDto).collect(Collectors.toList());

        return RoomDto.builder()
                .id(room.getId())
                .name(room.getName())
                .displayName(displayName)
                .type(room.getType())
                .members(members)
                .lastMessage(lastMessage)
                .unreadCount(unread)
                .createdAt(room.getCreatedAt())
                .build();
    }
}
