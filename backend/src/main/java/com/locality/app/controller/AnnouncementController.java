package com.locality.app.controller;

import com.locality.app.dto.*;
import com.locality.app.service.AnnouncementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AnnouncementDto>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(announcementService.getAll(page, size)));
    }

    @GetMapping("/urgent")
    public ResponseEntity<ApiResponse<List<AnnouncementDto>>> getUrgent() {
        return ResponseEntity.ok(ApiResponse.ok(announcementService.getUrgent()));
    }

    @GetMapping("/tag/{tag}")
    public ResponseEntity<ApiResponse<List<AnnouncementDto>>> getByTag(@PathVariable String tag) {
        return ResponseEntity.ok(ApiResponse.ok(announcementService.getByTag(tag)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AnnouncementDto>> create(
            @Valid @RequestBody CreateAnnouncementRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AnnouncementDto announcement = announcementService.create(request, userDetails.getUsername());
        // Push real-time to all connected clients
        messagingTemplate.convertAndSend("/topic/announcements", announcement);
        return ResponseEntity.ok(ApiResponse.ok("Announcement posted", announcement));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        announcementService.delete(id);
        messagingTemplate.convertAndSend("/topic/announcements.delete", id);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }
}
