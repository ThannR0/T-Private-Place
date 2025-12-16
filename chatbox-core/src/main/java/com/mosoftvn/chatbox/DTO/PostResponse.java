package com.mosoftvn.chatbox.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Builder
@Data
@NoArgsConstructor
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

    private String backgroundTheme;

    // Thông tin tương tác MỚI
    private Map<String, String> reactions;
    private int likeCount;
    private boolean likedByMe;
    private List<CommentDTO> comments; // Danh sách comment




    // Inner class DTO cho Comment
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class CommentDTO {
        private Long id;
        private String content;
        private String username;
        private String fullName;
        private String avatar;
        private LocalDateTime createdAt;
    }
}