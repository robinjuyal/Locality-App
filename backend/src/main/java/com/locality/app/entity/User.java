package com.locality.app.entity;

import com.locality.app.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "house_number")
    private String houseNumber;

    @Column(name = "shop_name")
    private String shopName;

    @Column(name = "upi_id")
    private String upiId;

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    @Column(name = "profile_pic")
    private String profilePic;

    // Online presence
    @Column(name = "is_online")
    @Builder.Default
    private boolean online = false;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    // About / status text
    @Column(name = "about")
    @Builder.Default
    private String about = "Hey, I'm on LocalityApp!";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private Wallet wallet;
}
