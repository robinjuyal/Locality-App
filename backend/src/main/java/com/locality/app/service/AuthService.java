package com.locality.app.service;

import com.locality.app.dto.*;
import com.locality.app.entity.User;
import com.locality.app.entity.Wallet;
import com.locality.app.enums.Role;
import com.locality.app.exception.AppException;
import com.locality.app.repository.UserRepository;
import com.locality.app.repository.WalletRepository;
import com.locality.app.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getPhone(), request.getPassword())
        );
        User user = userRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new AppException("User not found"));
        if (!user.isActive()) throw new AppException("Account is deactivated");

        // Mark online
        userRepository.updateOnlineStatus(user.getId(), true, LocalDateTime.now());

        String token = jwtUtils.generateToken(user.getPhone(), user.getRole().name(), user.getId());
        return AuthResponse.builder().token(token).user(toUserDto(user)).build();
    }

    @Transactional
    public UserDto registerUser(RegisterUserRequest request) {
        if (userRepository.existsByPhone(request.getPhone()))
            throw new AppException("Phone number already registered");

        Role role = request.getRole() != null ? request.getRole() : Role.RESIDENT;
        User user = User.builder()
                .phone(request.getPhone())
                .name(request.getName())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .houseNumber(request.getHouseNumber())
                .shopName(request.getShopName())
                .upiId(request.getUpiId())
                .active(true)
                .build();
        user = userRepository.save(user);

        Wallet wallet = Wallet.builder().user(user).lastUpdated(LocalDateTime.now()).build();
        walletRepository.save(wallet);
        return toUserDto(user);
    }

    public static UserDto toUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .phone(user.getPhone())
                .name(user.getName())
                .role(user.getRole())
                .houseNumber(user.getHouseNumber())
                .shopName(user.getShopName())
                .profilePic(user.getProfilePic())
                .active(user.isActive())
                .online(user.isOnline())
                .lastSeen(user.getLastSeen())
                .about(user.getAbout())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
