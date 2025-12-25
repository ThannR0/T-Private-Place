package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String recipient; // Tên người nhận
    private String content;   // Nội dung
    private Long relatedPostId; // ID bài viết liên quan

    private boolean isRead = false; // Đã đọc chưa
    private LocalDateTime createdAt = LocalDateTime.now();
}
