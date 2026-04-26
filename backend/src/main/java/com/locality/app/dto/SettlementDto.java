package com.locality.app.dto;

import com.locality.app.enums.SettlementStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SettlementDto {
    private Long id;
    private Long shopkeeperId;
    private String shopkeeperName;
    private String shopName;
    private BigDecimal amount;
    private LocalDate settlementDate;
    private SettlementStatus status;
    private String upiId;
    private LocalDateTime paidAt;
    private String adminNote;
    private LocalDateTime createdAt;
}
