package com.locality.app.websocket;

import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PresenceEvent {
    private Long userId;
    private String userName;
    private boolean online;
    private LocalDateTime lastSeen;

}
