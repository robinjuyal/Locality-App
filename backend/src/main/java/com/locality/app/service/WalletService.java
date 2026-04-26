package com.locality.app.service;

import com.locality.app.dto.*;
import com.locality.app.entity.*;
import com.locality.app.enums.*;
import com.locality.app.exception.AppException;
import com.locality.app.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final SettlementRepository settlementRepository;
    private final UserRepository userRepository;

    // ── Wallet Info ────────────────────────────────────────────────────────────

    public WalletDto getWallet(Long userId) {
        Wallet wallet = getWalletEntity(userId);
        return toWalletDto(wallet);
    }

    public List<LedgerEntryDto> getTransactions(Long userId, int page, int size) {
        Wallet wallet = getWalletEntity(userId);
        Pageable pageable = PageRequest.of(page, size);
        return ledgerEntryRepository.findByWalletOrderByCreatedAtDesc(wallet, pageable)
                .stream().map(this::toLedgerDto).collect(Collectors.toList());
    }

    // ── Top Up (Admin credits a resident's wallet) ─────────────────────────────

    @Transactional
    public WalletDto topUp(Long targetUserId, BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new AppException("Amount must be positive");
        Wallet wallet = getWalletEntity(targetUserId);
        BigDecimal newBalance = wallet.getBalance().add(amount);
        wallet.setBalance(newBalance);
        wallet.setLastUpdated(LocalDateTime.now());

        LedgerEntry entry = LedgerEntry.builder()
                .wallet(wallet)
                .type(TransactionType.CREDIT)
                .amount(amount)
                .balanceAfter(newBalance)
                .description(description != null ? description : "Wallet top-up")
                .build();

        walletRepository.save(wallet);
        ledgerEntryRepository.save(entry);
        return toWalletDto(wallet);
    }

    // ── Pay Shopkeeper ─────────────────────────────────────────────────────────

    @Transactional
    public WalletDto pay(Long buyerId, Long shopkeeperId, BigDecimal amount, String note) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new AppException("Amount must be positive");

        Wallet buyerWallet = getWalletEntity(buyerId);
        if (buyerWallet.getBalance().compareTo(amount) < 0) {
            throw new AppException("Insufficient token balance");
        }

        User shopkeeper = userRepository.findById(shopkeeperId)
                .orElseThrow(() -> new AppException("Shopkeeper not found"));
        if (shopkeeper.getRole() != Role.SHOPKEEPER) {
            throw new AppException("Target is not a shopkeeper");
        }

        Wallet shopWallet = getWalletEntity(shopkeeperId);

        // Debit buyer
        BigDecimal buyerNewBalance = buyerWallet.getBalance().subtract(amount);
        buyerWallet.setBalance(buyerNewBalance);
        buyerWallet.setLastUpdated(LocalDateTime.now());
        LedgerEntry debit = LedgerEntry.builder()
                .wallet(buyerWallet)
                .type(TransactionType.DEBIT)
                .amount(amount)
                .balanceAfter(buyerNewBalance)
                .description("Payment to " + shopkeeper.getShopName())
                .refUserId(shopkeeperId)
                .build();

        // Credit shopkeeper
        BigDecimal shopNewBalance = shopWallet.getBalance().add(amount);
        shopWallet.setBalance(shopNewBalance);
        shopWallet.setTotalEarned(shopWallet.getTotalEarned().add(amount));
        shopWallet.setPendingSettlement(shopWallet.getPendingSettlement().add(amount));
        shopWallet.setLastUpdated(LocalDateTime.now());
        LedgerEntry credit = LedgerEntry.builder()
                .wallet(shopWallet)
                .type(TransactionType.CREDIT)
                .amount(amount)
                .balanceAfter(shopNewBalance)
                .description("Payment from customer" + (note != null ? " - " + note : ""))
                .refUserId(buyerId)
                .build();

        walletRepository.save(buyerWallet);
        walletRepository.save(shopWallet);
        ledgerEntryRepository.save(debit);
        ledgerEntryRepository.save(credit);

        return toWalletDto(buyerWallet);
    }

    // ── Nightly Settlement (runs every day at 22:00) ───────────────────────────

    @Scheduled(cron = "0 0 22 * * *")
    @Transactional
    public void runNightlySettlement() {
        log.info("Running nightly settlement at {}", LocalDateTime.now());
        List<User> shopkeepers = userRepository.findByRoleAndActiveTrue(Role.SHOPKEEPER);

        for (User shopkeeper : shopkeepers) {
            Wallet wallet = getWalletEntity(shopkeeper.getId());
            BigDecimal pending = wallet.getPendingSettlement();

            if (pending.compareTo(BigDecimal.ZERO) <= 0) continue;
            if (settlementRepository.existsByShopkeeperAndSettlementDate(shopkeeper, LocalDate.now())) continue;

            Settlement settlement = Settlement.builder()
                    .shopkeeper(shopkeeper)
                    .amount(pending)
                    .settlementDate(LocalDate.now())
                    .status(SettlementStatus.PENDING)
                    .upiId(shopkeeper.getUpiId())
                    .build();
            settlementRepository.save(settlement);

            // Reset pending settlement; keep balance (shopkeeper can withdraw)
            wallet.setPendingSettlement(BigDecimal.ZERO);
            walletRepository.save(wallet);

            log.info("Settlement created for {} - ₹{}", shopkeeper.getName(), pending);
        }
    }

    // Admin: mark settlement as paid
    @Transactional
    public SettlementDto markSettlementPaid(Long settlementId, String adminNote) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new AppException("Settlement not found"));
        settlement.setStatus(SettlementStatus.PAID);
        settlement.setPaidAt(LocalDateTime.now());
        settlement.setAdminNote(adminNote);

        // Deduct from shopkeeper wallet balance
        Wallet wallet = getWalletEntity(settlement.getShopkeeper().getId());
        BigDecimal newBalance = wallet.getBalance().subtract(settlement.getAmount());
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) newBalance = BigDecimal.ZERO;
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        LedgerEntry entry = LedgerEntry.builder()
                .wallet(wallet)
                .type(TransactionType.DEBIT)
                .amount(settlement.getAmount())
                .balanceAfter(newBalance)
                .description("Settlement payout via UPI")
                .build();
        ledgerEntryRepository.save(entry);

        return toSettlementDto(settlementRepository.save(settlement));
    }

    public List<SettlementDto> getPendingSettlements() {
        return settlementRepository.findByStatusOrderByCreatedAtDesc(SettlementStatus.PENDING)
                .stream().map(this::toSettlementDto).collect(Collectors.toList());
    }

    public List<SettlementDto> getShopkeeperSettlements(Long shopkeeperId) {
        User shopkeeper = userRepository.findById(shopkeeperId)
                .orElseThrow(() -> new AppException("User not found"));
        return settlementRepository.findByShopkeeperOrderByCreatedAtDesc(shopkeeper)
                .stream().map(this::toSettlementDto).collect(Collectors.toList());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Wallet getWalletEntity(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException("Wallet not found for user " + userId));
    }

    private WalletDto toWalletDto(Wallet w) {
        return WalletDto.builder()
                .id(w.getId())
                .userId(w.getUser().getId())
                .userName(w.getUser().getName())
                .balance(w.getBalance())
                .totalEarned(w.getTotalEarned())
                .pendingSettlement(w.getPendingSettlement())
                .lastUpdated(w.getLastUpdated())
                .build();
    }

    private LedgerEntryDto toLedgerDto(LedgerEntry e) {
        return LedgerEntryDto.builder()
                .id(e.getId())
                .type(e.getType())
                .amount(e.getAmount())
                .balanceAfter(e.getBalanceAfter())
                .description(e.getDescription())
                .refUserId(e.getRefUserId())
                .createdAt(e.getCreatedAt())
                .build();
    }

    private SettlementDto toSettlementDto(Settlement s) {
        return SettlementDto.builder()
                .id(s.getId())
                .shopkeeperId(s.getShopkeeper().getId())
                .shopkeeperName(s.getShopkeeper().getName())
                .shopName(s.getShopkeeper().getShopName())
                .amount(s.getAmount())
                .settlementDate(s.getSettlementDate())
                .status(s.getStatus())
                .upiId(s.getUpiId())
                .paidAt(s.getPaidAt())
                .adminNote(s.getAdminNote())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
