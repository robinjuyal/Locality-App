package com.locality.app.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageDto {
    private Long id;
    private Long roomId;
    private String roomName;
    private UserDto sender;
    private String content;
    private String mediaUrl;
    private String messageType;
    private List<Long> readBy;
    private boolean deleted;
    private boolean forwarded;
    private boolean pinned;
    private Map<String, List<Long>> reactions; // emoji -> list of userIds
    private MessageDto replyTo; // quoted message
    private LocalDateTime createdAt;
}
