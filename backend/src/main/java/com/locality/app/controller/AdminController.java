package com.locality.app.controller;

import com.locality.app.dto.*;
import com.locality.app.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AuthService authService;
    private final UserService userService;
    private final WalletService walletService;

    // ── User Management ────────────────────────────────────────────────────────

    @PostMapping("/users/register")
    public ResponseEntity<ApiResponse<UserDto>> registerUser(@Valid @RequestBody RegisterUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("User registered", authService.registerUser(request)));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @GetMapping("/users/shopkeepers")
    public ResponseEntity<ApiResponse<List<UserDto>>> getShopkeepers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getShopkeepers()));
    }

    @GetMapping("/users/residents")
    public ResponseEntity<ApiResponse<List<UserDto>>> getResidents() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getResidents()));
    }

    @PatchMapping("/users/{userId}/toggle")
    public ResponseEntity<ApiResponse<UserDto>> toggleUser(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.toggleUserActive(userId)));
    }

    // ── Wallet Top-Up ──────────────────────────────────────────────────────────

    @PostMapping("/wallet/topup")
    public ResponseEntity<ApiResponse<WalletDto>> topUp(@Valid @RequestBody TopUpRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Wallet topped up",
                walletService.topUp(request.getUserId(), request.getAmount(), "Admin top-up")));
    }

    // ── Settlements ────────────────────────────────────────────────────────────

    @GetMapping("/settlements/pending")
    public ResponseEntity<ApiResponse<List<SettlementDto>>> getPendingSettlements() {
        return ResponseEntity.ok(ApiResponse.ok(walletService.getPendingSettlements()));
    }

    @PatchMapping("/settlements/{id}/paid")
    public ResponseEntity<ApiResponse<SettlementDto>> markPaid(
            @PathVariable Long id,
            @RequestParam(required = false) String note) {
        return ResponseEntity.ok(ApiResponse.ok("Settlement marked as paid",
                walletService.markSettlementPaid(id, note)));
    }

    @PostMapping("/settlements/run")
    public ResponseEntity<ApiResponse<Void>> runSettlement() {
        walletService.runNightlySettlement();
        return ResponseEntity.ok(ApiResponse.ok("Settlement job triggered", null));
    }
}
