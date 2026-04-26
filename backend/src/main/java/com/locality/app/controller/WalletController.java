package com.locality.app.controller;

import com.locality.app.dto.*;
import com.locality.app.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<WalletDto>> getMyWallet(
            @AuthenticationPrincipal UserDetails userDetails) {
        UserDto me = userService.getByPhone(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(walletService.getWallet(me.getId())));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<LedgerEntryDto>>> getTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UserDto me = userService.getByPhone(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(walletService.getTransactions(me.getId(), page, size)));
    }

    @PostMapping("/pay")
    public ResponseEntity<ApiResponse<WalletDto>> pay(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PayRequest request) {
        UserDto me = userService.getByPhone(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Payment successful",
                walletService.pay(me.getId(), request.getShopkeeperId(), request.getAmount(), request.getNote())));
    }

    @GetMapping("/shopkeeper/me")
    public ResponseEntity<ApiResponse<WalletDto>> getShopkeeperWallet(
            @AuthenticationPrincipal UserDetails userDetails) {
        UserDto me = userService.getByPhone(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(walletService.getWallet(me.getId())));
    }

    @GetMapping("/shopkeeper/settlements")
    public ResponseEntity<ApiResponse<List<SettlementDto>>> getMySettlements(
            @AuthenticationPrincipal UserDetails userDetails) {
        UserDto me = userService.getByPhone(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(walletService.getShopkeeperSettlements(me.getId())));
    }
}
