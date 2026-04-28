package com.locality.app.controller;

import com.locality.app.dto.*;
import com.locality.app.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserService userService;
    private final FileStorageService fileStorageService;

    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<RoomDto>>> getMyRooms(@AuthenticationPrincipal UserDetails ud) {
        UserDto me = userService.getByPhone(ud.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(chatService.getUserRooms(me.getId())));
    }

    @PostMapping("/rooms/direct/{targetUserId}")
    public ResponseEntity<ApiResponse<RoomDto>> openDirectRoom(
            @AuthenticationPrincipal UserDetails ud, @PathVariable Long targetUserId) {
        UserDto me = userService.getByPhone(ud.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(chatService.getOrCreateDirectRoom(me.getId(), targetUserId)));
    }

    @PostMapping("/rooms/group")
    public ResponseEntity<ApiResponse<RoomDto>> createGroup(
            @AuthenticationPrincipal UserDetails ud,
            @Valid @RequestBody CreateGroupRequest request) {
        UserDto me = userService.getByPhone(ud.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(chatService.createGroup(request.getGroupName(), me.getId(), request.getMemberIds())));
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<List<MessageDto>>> getMessages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getRoomMessages(roomId, page, size)));
    }

    @GetMapping("/rooms/{roomId}/pinned")
    public ResponseEntity<ApiResponse<List<MessageDto>>> getPinned(@PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getPinnedMessages(roomId)));
    }

    @GetMapping("/rooms/{roomId}/search")
    public ResponseEntity<ApiResponse<List<MessageDto>>> searchMessages(
            @PathVariable Long roomId, @RequestParam String q) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.searchMessages(roomId, q)));
    }

    @PostMapping("/rooms/{roomId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable Long roomId, @AuthenticationPrincipal UserDetails ud) {
        UserDto me = userService.getByPhone(ud.getUsername());
        chatService.markAsRead(roomId, me.getId());
        return ResponseEntity.ok(ApiResponse.ok("Marked as read", null));
    }

    @PostMapping("/messages/{messageId}/react")
    public ResponseEntity<ApiResponse<MessageDto>> react(
            @PathVariable Long messageId,
            @RequestBody ReactRequest request,
            @AuthenticationPrincipal UserDetails ud) {
        UserDto me = userService.getByPhone(ud.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(chatService.reactToMessage(messageId, me.getId(), request.getEmoji())));
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<ApiResponse<MessageDto>> deleteMessage(
            @PathVariable Long messageId, @AuthenticationPrincipal UserDetails ud) {
        UserDto me = userService.getByPhone(ud.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(chatService.deleteMessage(messageId, me.getId())));
    }

    @PostMapping("/messages/{messageId}/pin")
    public ResponseEntity<ApiResponse<MessageDto>> pinMessage(
            @PathVariable Long messageId, @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.pinMessage(messageId, null)));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<String>> uploadMedia(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeFile(file, "media");
        return ResponseEntity.ok(ApiResponse.ok("File uploaded", url));
    }

    @PostMapping("/upload/voice")
    public ResponseEntity<ApiResponse<String>> uploadVoice(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeFile(file, "voice");
        return ResponseEntity.ok(ApiResponse.ok("Voice uploaded", url));
    }
}
