package com.mosoftvn.chatbox.DTO;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

import java.util.List;

@Data
@Builder
public class EventResponse {
    private Long id;
    private String title;
    private String description;
    private String imageUrl;

    private String locationName;
    private String address;
    private Double latitude;
    private Double longitude;

    private LocalDateTime startTime;
    private LocalDateTime createdAt;

    // Thông tin người tạo
    private String creatorName;
    private String creatorAvatar;
    private Long creatorId;

    private Integer maxParticipants;
    private List<String> participantsList;
    private List<ParticipantDTO> participants;
    private String creatorUsername;

    // Thông tin tham gia
    private int participantCount;
    private boolean isJoined; // User hiện tại đã tham gia chưa?
}