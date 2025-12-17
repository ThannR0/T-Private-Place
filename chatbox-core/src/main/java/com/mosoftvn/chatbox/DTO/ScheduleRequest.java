package com.mosoftvn.chatbox.DTO;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ScheduleRequest {
    private Long id; // Có id dùng cho Update
    private String title;
    private String description;
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private boolean isAllDay;
    private String color;
}