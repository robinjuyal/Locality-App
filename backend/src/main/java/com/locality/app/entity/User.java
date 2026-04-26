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
    private String shopName;  // only for SHOPKEEPER

    @Column(name = "upi_id")
    private String upiId;     // only for SHOPKEEPER, for nightly settlement

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    @Column(name = "profile_pic")
    private String profilePic;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private Wallet wallet;

    @OneToMany(mappedBy = "sender")
    private List<Message> sentMessages;
}
