package com.locality.app.service;

import com.locality.app.dto.*;
import com.locality.app.entity.*;
import com.locality.app.exception.AppException;
import com.locality.app.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // ── Rooms ──────────────────────────────────────────────────────────────────

    @Transactional
    public RoomDto getOrCreateDirectRoom(Long userAId, Long userBId) {
        Long lo = Math.min(userAId, userBId);
        Long hi = Math.max(userAId, userBId);
        String roomName = "DM_" + lo + "_" + hi;
        Room room = roomRepository.findByName(roomName).orElseGet(() -> {
            User userA = getUser(userAId);
            User userB = getUser(userBId);
            return roomRepository.save(Room.builder()
                    .name(roomName).type("DIRECT").createdBy(userAId)
                    .members(new ArrayList<>(List.of(userA, userB))).build());
        });
        return toRoomDto(room, userAId);
    }

    @Transactional
    public RoomDto createGroup(String groupName, Long creatorId, List<Long> memberIds) {
        User creator = getUser(creatorId);
        List<User> members = new ArrayList<>();
        members.add(creator);
        for (Long id : memberIds) {
            if (!id.equals(creatorId)) members.add(getUser(id));
        }
        Room room = roomRepository.save(Room.builder()
                .name("GROUP_" + System.currentTimeMillis())
                .type("GROUP")
                .displayName(groupName)
                .createdBy(creatorId)
                .members(members).build());
        return toRoomDto(room, creatorId);
    }

    public Room getOrCreateBroadcastRoom() {
        return roomRepository.findByNameAndType("locality-broadcast", "BROADCAST")
                .orElseGet(() -> roomRepository.save(Room.builder()
                        .name("locality-broadcast").type("BROADCAST")
                        .displayName("📢 Locality Group")
                        .members(new ArrayList<>()).build()));
    }

    public List<RoomDto> getUserRooms(Long userId) {
        User user = getUser(userId);
        List<Room> rooms = roomRepository.findRoomsByMember(user);
        // Add broadcast room for everyone
        roomRepository.findByNameAndType("locality-broadcast", "BROADCAST")
                .ifPresent(br -> { if (!rooms.contains(br)) rooms.add(0, br); });
        return rooms.stream().map(r -> toRoomDto(r, userId)).collect(Collectors.toList());
    }

    // ── Messages ───────────────────────────────────────────────────────────────

    @Transactional
    public MessageDto saveMessage(Long roomId, Long senderId, String content,
                                  String mediaUrl, String messageType,
                                  Long replyToId, Boolean forwarded) {
        Room room = getRoom(roomId);
        User sender = getUser(senderId);
        Message replyTo = replyToId != null
                ? messageRepository.findById(replyToId).orElse(null) : null;

        Message message = Message.builder()
                .room(room).sender(sender).content(content)
                .mediaUrl(mediaUrl)
                .messageType(messageType != null ? messageType : "TEXT")
                .replyTo(replyTo).forwarded(Boolean.TRUE.equals(forwarded))
                .readBy(senderId + ",")
                .build();
        return toMessageDto(messageRepository.save(message));
    }

    @Transactional
    public MessageDto reactToMessage(Long messageId, Long userId, String emoji) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException("Message not found"));

        Map<String, List<Long>> reactions = parseReactions(msg.getReactions());
        List<Long> users = reactions.computeIfAbsent(emoji, k -> new ArrayList<>());

        if (users.contains(userId)) {
            users.remove(userId); // toggle off
            if (users.isEmpty()) reactions.remove(emoji);
        } else {
            // Remove user from any other emoji first (one reaction per user)
            reactions.values().forEach(list -> list.remove(userId));
            reactions.values().removeIf(List::isEmpty);
            reactions.computeIfAbsent(emoji, k -> new ArrayList<>()).add(userId);
        }

        try {
            msg.setReactions(objectMapper.writeValueAsString(reactions));
        } catch (Exception e) { log.error("Failed to serialize reactions", e); }
        return toMessageDto(messageRepository.save(msg));
    }

    @Transactional
    public MessageDto deleteMessage(Long messageId, Long userId) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException("Message not found"));
        if (!msg.getSender().getId().equals(userId))
            throw new AppException("Can only delete your own messages");
        msg.setDeleted(true);
        msg.setContent("This message was deleted");
        msg.setMediaUrl(null);
        return toMessageDto(messageRepository.save(msg));
    }

    @Transactional
    public MessageDto pinMessage(Long messageId, Long userId) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException("Message not found"));
        msg.setPinned(!msg.isPinned());
        return toMessageDto(messageRepository.save(msg));
    }

    @Transactional
    public void markAsRead(Long roomId, Long userId) {
        Room room = getRoom(roomId);
        List<Message> unread = messageRepository
                .findByRoomOrderByCreatedAtAsc(room, Pageable.unpaged())
                .stream()
                .filter(m -> !m.getSender().getId().equals(userId))
                .filter(m -> {
                    String rb = m.getReadBy() == null ? "" : m.getReadBy();
                    return !Arrays.asList(rb.split(",")).contains(String.valueOf(userId));
                })
                .collect(Collectors.toList());

        for (Message m : unread) {
            String rb = m.getReadBy() == null ? "" : m.getReadBy();
            if (!rb.contains(String.valueOf(userId))) {
                m.setReadBy(rb + userId + ",");
            }
        }
        if (!unread.isEmpty()) messageRepository.saveAll(unread);
    }

    public List<MessageDto> getRoomMessages(Long roomId, int page, int size) {
        Room room = getRoom(roomId);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        return messageRepository.findByRoomOrderByCreatedAtAsc(room, pageable)
                .stream().map(this::toMessageDto).collect(Collectors.toList());
    }

    public List<MessageDto> getPinnedMessages(Long roomId) {
        Room room = getRoom(roomId);
        return messageRepository.findByRoomAndPinnedTrueOrderByCreatedAtDesc(room)
                .stream().map(this::toMessageDto).collect(Collectors.toList());
    }

    public List<MessageDto> searchMessages(Long roomId, String query) {
        Room room = getRoom(roomId);
        return messageRepository.searchMessages(room, query)
                .stream().map(this::toMessageDto).collect(Collectors.toList());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Map<String, List<Long>> parseReactions(String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) { return new LinkedHashMap<>(); }
    }

    private List<Long> parseReadBy(String readBy) {
        if (readBy == null || readBy.isBlank()) return new ArrayList<>();
        return Arrays.stream(readBy.split(","))
                .filter(s -> !s.isBlank())
                .map(s -> { try { return Long.parseLong(s.trim()); } catch (Exception e) { return null; } })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public MessageDto toMessageDto(Message m) {
        MessageDto.MessageDtoBuilder b = MessageDto.builder()
                .id(m.getId())
                .roomId(m.getRoom().getId())
                .roomName(m.getRoom().getName())
                .sender(AuthService.toUserDto(m.getSender()))
                .content(m.isDeleted() ? "This message was deleted" : m.getContent())
                .mediaUrl(m.isDeleted() ? null : m.getMediaUrl())
                .messageType(m.getMessageType())
                .readBy(parseReadBy(m.getReadBy()))
                .deleted(m.isDeleted())
                .forwarded(m.isForwarded())
                .pinned(m.isPinned())
                .reactions(parseReactions(m.getReactions()))
                .createdAt(m.getCreatedAt());

        if (m.getReplyTo() != null && !m.getReplyTo().isDeleted()) {
            Message rt = m.getReplyTo();
            b.replyTo(MessageDto.builder()
                    .id(rt.getId())
                    .sender(AuthService.toUserDto(rt.getSender()))
                    .content(rt.getContent())
                    .messageType(rt.getMessageType())
                    .mediaUrl(rt.getMediaUrl())
                    .build());
        }
        return b.build();
    }

    private RoomDto toRoomDto(Room room, Long currentUserId) {
        String displayName = room.getDisplayName();
        if (displayName == null || displayName.isBlank()) {
            if ("DIRECT".equals(room.getType()) && room.getMembers() != null) {
                displayName = room.getMembers().stream()
                        .filter(u -> !u.getId().equals(currentUserId))
                        .map(User::getName).findFirst().orElse(room.getName());
            } else {
                displayName = room.getName();
            }
        }

        long unread = 0;
        try { unread = messageRepository.countUnreadMessages(room, currentUserId); } catch (Exception ignored) {}

        Pageable lastOne = PageRequest.of(0, 1, Sort.by("createdAt").descending());
        MessageDto lastMessage = messageRepository
                .findByRoomOrderByCreatedAtAsc(room, lastOne)
                .stream().map(this::toMessageDto).findFirst().orElse(null);

        // For direct rooms, get the other person's online status
        UserDto otherUser = null;
        if ("DIRECT".equals(room.getType()) && room.getMembers() != null) {
            otherUser = room.getMembers().stream()
                    .filter(u -> !u.getId().equals(currentUserId))
                    .map(AuthService::toUserDto).findFirst().orElse(null);
        }

        List<UserDto> members = room.getMembers() == null ? List.of() :
                room.getMembers().stream().map(AuthService::toUserDto).collect(Collectors.toList());

        return RoomDto.builder()
                .id(room.getId()).name(room.getName()).displayName(displayName)
                .type(room.getType()).members(members).otherUser(otherUser)
                .lastMessage(lastMessage).unreadCount(unread)
                .createdAt(room.getCreatedAt()).build();
    }

    private Room getRoom(Long id) {
        return roomRepository.findById(id).orElseThrow(() -> new AppException("Room not found"));
    }
    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new AppException("User not found"));
    }
}
