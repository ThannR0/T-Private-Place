package com.mosoftvn.chatbox.DTO;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class EventRequest {
    private Long id;
    private String title;
    private String description;

    // Maps info
    private String locationName;
    private String address;
    private Double latitude;
    private Double longitude;

    private Integer maxParticipants;

    private LocalDateTime startTime;

    // Danh sách ID những người được mời (nếu có)
    private List<Long> invitedUserIds;
}