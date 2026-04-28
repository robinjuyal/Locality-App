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
    private String groupIcon;
    private List<UserDto> members;
    private UserDto otherUser; // for direct rooms, the other person
    private MessageDto lastMessage;
    private long unreadCount;
    private LocalDateTime createdAt;
}
