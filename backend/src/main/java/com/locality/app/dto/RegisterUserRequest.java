package com.locality.app.dto;

import com.locality.app.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RegisterUserRequest {
    @NotBlank private String phone;
    @NotBlank @Size(min = 4) private String password;
    @NotBlank private String name;
    private Role role;
    private String houseNumber;
    private String shopName;
    private String upiId;
}
