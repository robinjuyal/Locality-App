package com.locality.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateGroupRequest {
    @NotBlank private String groupName;
    private List<Long> memberIds;
}
