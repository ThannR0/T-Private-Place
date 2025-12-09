package com.mosoftvn.chatbox.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class PostResponse {
    private Long id;
    private String content;
    private String imageUrl;
    private String mediaType;
    private LocalDateTime createdAt;

    // Thông tin người đăng
    private String username;
    private String fullName;
    private String userAvatar;

    // Thông tin tương tác MỚI
    private int likeCount;
    private boolean likedByMe; // Để hiện nút Like màu xanh
    private List<CommentDTO> comments; // Danh sách comment



    // Inner class DTO cho Comment
    @Data
    @AllArgsConstructor
    public static class CommentDTO {
        private Long id;
        private String content;
        private String username;
        private String fullName;
        private String avatar;
        private LocalDateTime createdAt;
    }
}