package com.locality.app.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageDto {
    private Long id;
    private Long roomId;
    private String roomName;
    private UserDto sender;
    private String content;
    private String mediaUrl;
    private String messageType;
    private boolean read;
    private LocalDateTime createdAt;
}
