package com.mosoftvn.chatbox.Controller;


import com.mosoftvn.chatbox.Entity.Notification;
import com.mosoftvn.chatbox.Service.NotificationService;
import org.aspectj.weaver.ast.Not;
import org.springframework.beans.factory.annotation.Autowired;
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
}
