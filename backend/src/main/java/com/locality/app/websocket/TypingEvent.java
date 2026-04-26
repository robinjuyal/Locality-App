package com.locality.app.websocket;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TypingEvent {
    private Long roomId;
    private Long userId;
    private String userName;
    private boolean typing;
}
