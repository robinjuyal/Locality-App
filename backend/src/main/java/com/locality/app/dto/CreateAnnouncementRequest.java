package com.locality.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateAnnouncementRequest {
    @NotBlank private String title;
    @NotBlank private String content;
    private String tag = "GENERAL";
    private boolean urgent = false;
}
