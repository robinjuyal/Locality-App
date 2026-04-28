package com.locality.app.dto;

import com.locality.app.enums.Role;
import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDto {
    private Long id;
    private String phone;
    private String name;
    private Role role;
    private String houseNumber;
    private String shopName;
    private String profilePic;
    private boolean active;
    private boolean online;
    private LocalDateTime lastSeen;
    private String about;
    private LocalDateTime createdAt;
}
