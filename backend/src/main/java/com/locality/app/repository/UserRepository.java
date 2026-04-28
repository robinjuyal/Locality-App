package com.locality.app.repository;

import com.locality.app.entity.User;
import com.locality.app.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);
    boolean existsByPhone(String phone);
    List<User> findByRole(Role role);
    List<User> findByActiveTrue();
    List<User> findByRoleAndActiveTrue(Role role);

    @Modifying @Transactional
    @Query("UPDATE User u SET u.online = :online, u.lastSeen = :lastSeen WHERE u.id = :userId")
    void updateOnlineStatus(@Param("userId") Long userId,
                            @Param("online") boolean online,
                            @Param("lastSeen") LocalDateTime lastSeen);
}
