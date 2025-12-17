package com.mosoftvn.chatbox.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class GroupDetailDTO {
    private Long id;
    private String name;
    private String avatar;
    private String adminUsername;
    private List<UserSummary> members; // Tái sử dụng UserSummary
}