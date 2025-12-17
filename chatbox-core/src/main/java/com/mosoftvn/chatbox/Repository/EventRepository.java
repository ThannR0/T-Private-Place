package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    // Lấy sự kiện chưa diễn ra (startTime > now), sắp xếp cái nào gần nhất lên đầu
    List<Event> findAllByStartTimeAfterOrderByStartTimeAsc(LocalDateTime now);

    // Lấy sự kiện của một người cụ thể (để xem lại lịch sử quản lý)
    List<Event> findAllByCreatorIdOrderByStartTimeDesc(Long creatorId);
}