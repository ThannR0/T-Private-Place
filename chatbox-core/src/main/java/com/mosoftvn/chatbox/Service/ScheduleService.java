package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.ScheduleRequest;
import com.mosoftvn.chatbox.DTO.ScheduleResponse;
import com.mosoftvn.chatbox.Entity.Schedule;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.ScheduleRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ScheduleService {

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AIScheduleService aiScheduleService;

    // 1. Tạo lịch trình
    public ScheduleResponse createSchedule(String username, ScheduleRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate logic
        if (req.getEndTime().isBefore(req.getStartTime())) {
            throw new RuntimeException("Thời gian kết thúc phải sau thời gian bắt đầu!");
        }

        Schedule schedule = Schedule.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .location(req.getLocation())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .isAllDay(req.isAllDay())
                .color(req.getColor() == null ? "#3788d8" : req.getColor()) // Default xanh dương
                .user(user)
                .build();

        Schedule saved = scheduleRepository.save(schedule);
        return mapToDTO(saved);
    }

    // 2. Lấy lịch theo khoảng thời gian (cho View Tuần/Tháng)
    public List<ScheduleResponse> getSchedules(String username, LocalDateTime start, LocalDateTime end) {
        List<Schedule> list = scheduleRepository.findSchedulesInRange(username, start, end);
        return list.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // 3. Sửa lịch
    public ScheduleResponse updateSchedule(String username, ScheduleRequest req) {
        Schedule schedule = scheduleRepository.findById(req.getId())
                .orElseThrow(() -> new RuntimeException("Not found"));

        if (!schedule.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized");
        }

        schedule.setTitle(req.getTitle());
        schedule.setDescription(req.getDescription());
        schedule.setLocation(req.getLocation());
        schedule.setStartTime(req.getStartTime());
        schedule.setEndTime(req.getEndTime());
        schedule.setAllDay(req.isAllDay());
        if (req.getColor() != null) schedule.setColor(req.getColor());

        return mapToDTO(scheduleRepository.save(schedule));
    }

    // 4. Xóa lịch
    public void deleteSchedule(Long id, String username) {
        Schedule schedule = scheduleRepository.findById(id).orElseThrow();
        if (!schedule.getUser().getUsername().equals(username)) throw new RuntimeException("Unauthorized");
        scheduleRepository.delete(schedule);
    }

    // 5. TÓM TẮT AI (Chức năng đặc biệt)
    public String getAiSummary(String username, LocalDate date) {
        // Lấy từ 00:00 đến 23:59 của ngày đó
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        List<Schedule> dailySchedules = scheduleRepository.findByDate(username, startOfDay, endOfDay);

        // Gọi AI Service để xử lý text
        String dateStr = date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        return aiScheduleService.generateDailySummary(dailySchedules, dateStr);
    }

    private ScheduleResponse mapToDTO(Schedule s) {
        return ScheduleResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .description(s.getDescription())
                .location(s.getLocation())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .isAllDay(s.isAllDay())
                .color(s.getColor())
                .userId(s.getUser().getId())
                .build();
    }
}