package com.locality.app.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PayRequest {
    @NotNull
    private Long shopkeeperId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    private String note;
}
