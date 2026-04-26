package com.locality.app.controller;

import com.locality.app.dto.*;
import com.locality.app.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<ApiResponse<List<RoomDto>>> getMyRooms(
            @AuthenticationPrincipal UserDetails userDetails) {
        UserDto me = userService.getByPhone(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(chatService.getUserRooms(me.getId())));
    }

    @PostMapping("/rooms/direct/{targetUserId}")
    public ResponseEntity<ApiResponse<RoomDto>> openDirectRoom(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long targetUserId) {
        UserDto me = userService.getByPhone(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(
                chatService.getOrCreateDirectRoom(me.getId(), targetUserId)));
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<List<MessageDto>>> getMessages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getRoomMessages(roomId, page, size)));
    }

    @PostMapping("/rooms/{roomId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        UserDto me = userService.getByPhone(userDetails.getUsername());
        chatService.markAsRead(roomId, me.getId());
        return ResponseEntity.ok(ApiResponse.ok("Marked as read", null));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<String>> uploadMedia(
            @RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeFile(file, "media");
        return ResponseEntity.ok(ApiResponse.ok("File uploaded", url));
    }
}
