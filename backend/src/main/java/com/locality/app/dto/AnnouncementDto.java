package com.locality.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AnnouncementDto {
    private Long id;
    private String title;
    private String content;
    private String tag;
    private boolean urgent;
    private UserDto postedBy;
    private LocalDateTime createdAt;
}
