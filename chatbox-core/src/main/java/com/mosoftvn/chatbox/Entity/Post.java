package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT") // Để lưu nội dung dài
    private String content;

    private String imageUrl; // Link ảnh (nếu có)

    private String mediaType;

    private LocalDateTime createdAt;

    // Quan hệ: Một User có nhiều bài viết
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 1. Danh sách Comments
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC") // Bình luận cũ xếp trước
    private List<Comment> comments = new ArrayList<>();

    // 2. Danh sách ID người đã Like
    @ElementCollection
    @CollectionTable(name = "post_likes", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "user_id")
    private Set<Long> likedUserIds = new HashSet<>();

    // Tự động gán thời gian khi tạo
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}