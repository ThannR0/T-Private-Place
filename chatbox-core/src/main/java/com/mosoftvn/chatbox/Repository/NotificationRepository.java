package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // Tìm thông báo của một người, xếp theo mới nhất
    List<Notification> findByRecipientOrderByCreatedAtDesc(String recipient);

    // Tìm thông báo chưa đọc (để đánh dấu đã đọc)
    List<Notification> findByRecipientAndIsReadFalse(String recipient);

    void deleteById(String recipient);
    void deleteAllByUserId(String userId);
}
