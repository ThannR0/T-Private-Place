package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import java.util.*;

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

    // Cấu hình để lưu Map<String, String> vào bảng phụ "post_reactions"
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "post_reactions", joinColumns = @JoinColumn(name = "post_id"))
    @MapKeyColumn(name = "username") // Cột lưu Key (Tên người dùng)
    @Column(name = "reaction_type")  // Cột lưu Value (Loại cảm xúc)
    private Map<String, String> reactions = new HashMap<>();

    // Tạo hàm ảo để lấy số lượng like từ reactions
    // @Transient nghĩa là không lưu cột này vào DB, chỉ tính toán lúc chạy
    @Transient
    public int getLikeCount() {
        return reactions != null ? reactions.size() : 0;
    }

    @Column(name = "background_theme")
    private String backgroundTheme;

    // Tự động gán thời gian khi tạo
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}