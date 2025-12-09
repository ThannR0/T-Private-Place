package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String content;

    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user; // Người bình luận

    @ManyToOne
    @JoinColumn(name = "post_id")
    private Post post; // Bình luận cho bài nào

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}