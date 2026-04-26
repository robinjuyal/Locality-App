package com.locality.app.repository;

import com.locality.app.entity.User;
import com.locality.app.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);
    boolean existsByPhone(String phone);
    List<User> findByRole(Role role);
    List<User> findByActiveTrue();
    List<User> findByRoleAndActiveTrue(Role role);
}
