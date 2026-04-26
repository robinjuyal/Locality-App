package com.locality.app.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "wallets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // 1 token = 1 rupee
    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    // Total tokens earned (SHOPKEEPER: total received from customers)
    @Column(name = "total_earned", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalEarned = BigDecimal.ZERO;

    // Tokens pending settlement (only for shopkeepers, reset after nightly job)
    @Column(name = "pending_settlement", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal pendingSettlement = BigDecimal.ZERO;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @OneToMany(mappedBy = "wallet", cascade = CascadeType.ALL)
    private List<LedgerEntry> ledgerEntries;
}
