package com.locality.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class LoginRequest {
    @NotBlank private String phone;
    @NotBlank private String password;
}
