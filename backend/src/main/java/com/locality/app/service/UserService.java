package com.locality.app.service;

import com.locality.app.dto.UserDto;
import com.locality.app.entity.User;
import com.locality.app.enums.Role;
import com.locality.app.exception.AppException;
import com.locality.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserDto getById(Long id) {
        return userRepository.findById(id).map(AuthService::toUserDto)
                .orElseThrow(() -> new AppException("User not found"));
    }

    public UserDto getByPhone(String phone) {
        return userRepository.findByPhone(phone).map(AuthService::toUserDto)
                .orElseThrow(() -> new AppException("User not found"));
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findByActiveTrue().stream().map(AuthService::toUserDto).toList();
    }

    public List<UserDto> getShopkeepers() {
        return userRepository.findByRoleAndActiveTrue(Role.SHOPKEEPER).stream().map(AuthService::toUserDto).toList();
    }

    public List<UserDto> getResidents() {
        return userRepository.findByRoleAndActiveTrue(Role.RESIDENT).stream().map(AuthService::toUserDto).toList();
    }

    @Transactional
    public UserDto toggleUserActive(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException("User not found"));
        user.setActive(!user.isActive());
        return AuthService.toUserDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateProfile(Long userId, String name, String houseNumber, String profilePic, String about) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException("User not found"));
        if (name != null) user.setName(name);
        if (houseNumber != null) user.setHouseNumber(houseNumber);
        if (profilePic != null) user.setProfilePic(profilePic);
        if (about != null) user.setAbout(about);
        return AuthService.toUserDto(userRepository.save(user));
    }

    @Transactional
    public void setOnlineStatus(Long userId, boolean online) {
        userRepository.updateOnlineStatus(userId, online, LocalDateTime.now());
    }

    public User getEntityByPhone(String phone) {
        return userRepository.findByPhone(phone).orElseThrow(() -> new AppException("User not found"));
    }

    public User getEntityById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new AppException("User not found"));
    }
}
