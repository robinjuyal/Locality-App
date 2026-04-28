package com.locality.app.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SendMessageRequest {
    private Long roomId;
    private String content;
    private String messageType;
    private String mediaUrl;
    private Long replyToId;
    private Boolean forwarded; // Boolean (wrapper) not boolean (primitive) — allows null from frontend
}
