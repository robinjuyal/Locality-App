package com.locality.app.config;

import com.locality.app.dto.RegisterUserRequest;
import com.locality.app.enums.Role;
import com.locality.app.repository.UserRepository;
import com.locality.app.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminBootstrap {

    private final UserRepository userRepository;
    private final AuthService authService;

    @Value("${app.admin.phone}") private String adminPhone;
    @Value("${app.admin.password}") private String adminPassword;
    @Value("${app.admin.name}") private String adminName;

    @Bean
    public ApplicationRunner bootstrapAdmin() {
        return args -> {
            if (!userRepository.existsByPhone(adminPhone)) {
                authService.registerUser(RegisterUserRequest.builder()
                        .phone(adminPhone)
                        .password(adminPassword)
                        .name(adminName)
                        .role(Role.ADMIN)
                        .build());
                log.info("✅ Admin account created: phone={}", adminPhone);
            } else {
                log.info("Admin account already exists, skipping bootstrap");
            }
        };
    }
}
