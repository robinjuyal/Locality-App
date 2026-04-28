package com.locality.app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "media_url")
    private String mediaUrl;

    // TEXT, IMAGE, VOICE, VIDEO
    @Column(name = "message_type")
    @Builder.Default
    private String messageType = "TEXT";

    // READ_BY: comma-separated user IDs who have read this
    @Column(name = "read_by", columnDefinition = "TEXT")
    @Builder.Default
    private String readBy = "";

    // Reply support
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private Message replyTo;

    // Deleted for everyone
    @Column(name = "deleted")
    @Builder.Default
    private boolean deleted = false;

    // Forwarded
    @Column(name = "forwarded")
    @Builder.Default
    private boolean forwarded = false;

    // Pinned
    @Column(name = "pinned")
    @Builder.Default
    private boolean pinned = false;

    // Reactions: stored as JSON string e.g. {"👍":[1,2],"❤️":[3]}
    @Column(name = "reactions", columnDefinition = "TEXT")
    private String reactions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
