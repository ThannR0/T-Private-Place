package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.ScheduleRequest;
import com.mosoftvn.chatbox.DTO.ScheduleResponse;
import com.mosoftvn.chatbox.Service.ScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@CrossOrigin(origins = "*")
public class ScheduleController {

    @Autowired
    private ScheduleService scheduleService;

    // Lấy lịch (Thường dùng cho Calendar View)
    // URL: /api/schedules?start=2023-10-01T00:00:00&end=2023-10-07T23:59:59
    @GetMapping
    public List<ScheduleResponse> getSchedules(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end
    ) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return scheduleService.getSchedules(username, start, end);
    }

    @PostMapping("/create")
    public ScheduleResponse create(@RequestBody ScheduleRequest req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return scheduleService.createSchedule(username, req);
    }

    @PutMapping("/update")
    public ScheduleResponse update(@RequestBody ScheduleRequest req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return scheduleService.updateSchedule(username, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        scheduleService.deleteSchedule(id, username);
    }

    // /api/schedules/summary?date=2023-10-25
    @GetMapping("/summary")
    public String getAiSummary(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return scheduleService.getAiSummary(username, date);
    }
}