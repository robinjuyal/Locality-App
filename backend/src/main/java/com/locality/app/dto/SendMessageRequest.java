package com.locality.app.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SendMessageRequest {
    private Long roomId;
    private String content;
    private String messageType; // TEXT, IMAGE
    private String mediaUrl;
}
