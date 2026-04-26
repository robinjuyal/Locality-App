package com.locality.app.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TopUpRequest {
    @NotNull
    @DecimalMin(value = "1.0")
    @DecimalMax(value = "100000.0")
    private BigDecimal amount;

    private Long userId; // admin can top up any user; residents top up themselves
}
