package com.locality.app.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomDto {
    private Long id;
    private String name;
    private String displayName;
    private String type;
    private List<UserDto> members;
    private MessageDto lastMessage;
    private long unreadCount;
    private LocalDateTime createdAt;
}
