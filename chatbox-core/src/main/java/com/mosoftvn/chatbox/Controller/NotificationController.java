package com.mosoftvn.chatbox.Controller;


import com.mosoftvn.chatbox.Entity.Notification;
import com.mosoftvn.chatbox.Service.NotificationService;
import jakarta.transaction.Transactional;
import org.aspectj.weaver.ast.Not;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;


import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    @Autowired private NotificationService notificationService;

    @GetMapping
    public List<Notification> getNotifications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return notificationService.getUserNotifications(username);
    }

    @PutMapping("/read")
    public void markRead() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        notificationService.markAllAsRead(username);
    }
    //Xóa 1 thông báo
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteOne(@PathVariable String id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok("Deleted");
    }

    //Xóa TẤT CẢ thông báo
    @DeleteMapping
    @Transactional // Nhớ import org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteAll() {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        notificationService.deleteAllNotifications(currentUser);
        return ResponseEntity.ok("Deleted All");
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markOneRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok("Success");
    }
}
