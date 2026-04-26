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
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final FileStorageService fileStorageService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMe(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getByPhone(userDetails.getUsername())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @GetMapping("/shopkeepers")
    public ResponseEntity<ApiResponse<List<UserDto>>> getShopkeepers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getShopkeepers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getById(id)));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<ApiResponse<UserDto>> uploadAvatar(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file) {
        UserDto user = userService.getByPhone(userDetails.getUsername());
        String url = fileStorageService.storeFile(file, "avatars");
        UserDto updated = userService.updateProfile(user.getId(), null, null, url);
        return ResponseEntity.ok(ApiResponse.ok("Avatar updated", updated));
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String houseNumber) {
        UserDto user = userService.getByPhone(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(user.getId(), name, houseNumber, null)));
    }
}
