package com.locality.app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "rooms")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Room {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    // Human-readable name for groups/broadcast
    @Column(name = "display_name")
    private String displayName;

    @Column(nullable = false)
    private String type; // DIRECT, GROUP, BROADCAST

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "group_icon")
    private String groupIcon;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL)
    private List<Message> messages;

    @ManyToMany
    @JoinTable(name = "room_members",
        joinColumns = @JoinColumn(name = "room_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id"))
    private List<User> members;
}
