package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.Entity.Schedule;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AIScheduleService {

    public String generateDailySummary(List<Schedule> schedules, String dateStr) {
        // Trường hợp không có lịch
        if (schedules == null || schedules.isEmpty()) {
            return "EMPTY_STATE|Hôm nay " + dateStr + " bạn hoàn toàn rảnh rỗi!|Hãy tận hưởng thời gian này để nghỉ ngơi hoặc học một kỹ năng mới.";
        }

        StringBuilder sb = new StringBuilder();

        // PHẦN 1: HEADER (Tiêu đề & Câu chào)
        sb.append("HEADER|Tổng quan lịch trình|Ngày ").append(dateStr).append("\n");

        int morning = 0, afternoon = 0, evening = 0;

        // PHẦN 2: TIMELINE (Danh sách chi tiết)
        sb.append("SECTION_TITLE|Chi tiết hoạt động\n");

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

        for (Schedule s : schedules) {
            int h = s.getStartTime().getHour();
            String timeOfDay = (h < 12) ? "MORNING" : (h < 18 ? "AFTERNOON" : "EVENING");

            if (h < 12) morning++;
            else if (h < 18) afternoon++;
            else evening++;

            // Format: TYPE|TimeStart - TimeEnd|Title|Location|Description|Color
            sb.append("EVENT|")
                    .append(timeOfDay).append("|")
                    .append(s.getStartTime().format(timeFmt)).append(" - ").append(s.getEndTime().format(timeFmt)).append("|")
                    .append(s.getTitle()).append("|")
                    .append(s.getLocation() == null ? "" : s.getLocation()).append("|")
                    .append(s.getDescription() == null ? "" : s.getDescription()).append("|")
                    .append(s.getColor() == null ? "#1890ff" : s.getColor())
                    .append("\n");
        }

        // PHẦN 3: THỐNG KÊ (Stats)
        sb.append("SECTION_TITLE|Thống kê nhanh\n");
        sb.append("STATS|Sáng:").append(morning).append("|Chiều:").append(afternoon).append("|Tối:").append(evening).append("\n");

        // PHẦN 4: LỜI KHUYÊN (Advice)
        sb.append("SECTION_TITLE|Góc nhìn AI\n");
        String advice;
        if (schedules.size() > 6) advice = "Hôm nay là một ngày \"rực lửa\"! 🔥 Khối lượng công việc khá lớn, bạn nhớ tuân thủ kỹ thuật Pomodoro để tránh kiệt sức nhé.";
        else if (schedules.size() > 3) advice = "Lịch trình hôm nay khá cân bằng. ⚖️ Bạn có đủ thời gian để hoàn thành tốt công việc và vẫn có thì giờ nghỉ ngơi.";
        else advice = "Một ngày thong thả. 🍃 Đây là cơ hội tuyệt vời để review lại các mục tiêu dài hạn hoặc đọc một cuốn sách hay.";

        sb.append("ADVICE|").append(advice).append("\n");

        return sb.toString();
    }
}