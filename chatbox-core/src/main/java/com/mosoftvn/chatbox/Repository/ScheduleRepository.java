package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    // Tìm tất cả lịch của user trong khoảng thời gian (Từ đầu tuần đến cuối tuần)
    //Sự kiện bắt đầu TRƯỚC khi khoảng kết thúc VÀ kết thúc SAU khi khoảng bắt đầu
    @Query("SELECT s FROM Schedule s WHERE s.user.username = :username " +
            "AND s.startTime < :rangeEnd AND s.endTime > :rangeStart " +
            "ORDER BY s.startTime ASC")
    List<Schedule> findSchedulesInRange(@Param("username") String username,
                                        @Param("rangeStart") LocalDateTime rangeStart,
                                        @Param("rangeEnd") LocalDateTime rangeEnd);

    // Tìm lịch chính xác trong 1 ngày (AI tóm tắt)
    @Query("SELECT s FROM Schedule s WHERE s.user.username = :username " +
            "AND s.startTime >= :startOfDay AND s.startTime < :endOfDay " +
            "ORDER BY s.startTime ASC")
    List<Schedule> findByDate(@Param("username") String username,
                              @Param("startOfDay") LocalDateTime startOfDay,
                              @Param("endOfDay") LocalDateTime endOfDay);
}