package com.locality.app.dto;

import com.locality.app.enums.TransactionType;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WalletDto {
    private Long id;
    private Long userId;
    private String userName;
    private BigDecimal balance;
    private BigDecimal totalEarned;
    private BigDecimal pendingSettlement;
    private LocalDateTime lastUpdated;
}
