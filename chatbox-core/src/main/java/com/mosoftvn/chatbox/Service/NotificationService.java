package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.Entity.Notification;
import com.mosoftvn.chatbox.Repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Hàm tạo và gửi thông báo
    public void createNotification(String recipient, String content, Long postId) {
        Notification noti = new Notification();
        noti.setRecipient(recipient);
        noti.setContent(content);
        noti.setRelatedPostId(postId);
        // isRead mặc định là false, createdAt tự tạo

        notificationRepository.save(noti);

        // Gửi ngay lập tức qua Socket để hiện số đỏ
        messagingTemplate.convertAndSendToUser(recipient, "/queue/notifications", noti);
    }

    public List<Notification> getUserNotifications(String username) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(username);
    }

    public void markAllAsRead(String username) {
        List<Notification> list = notificationRepository.findByRecipientAndIsReadFalse(username);
        list.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(list);
    }
}