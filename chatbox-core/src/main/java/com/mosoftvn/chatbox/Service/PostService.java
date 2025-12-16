package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.PostResponse;
import com.mosoftvn.chatbox.Entity.Comment;
import com.mosoftvn.chatbox.Entity.Post;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.CommentRepository;
import com.mosoftvn.chatbox.Repository.PostRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private NotificationService notificationService;


    // 1. Đăng bài mới
    public PostResponse createPost(String username, String content, String imageUrl, String backgroundTheme) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = new Post();
        post.setContent(content);
        post.setUser(user);

        // Dùng LocalDateTime.now() thay cho new Date()
        post.setCreatedAt(LocalDateTime.now());

        post.setBackgroundTheme(backgroundTheme != null ? backgroundTheme : "default");

        post.setLikedUserIds(new HashSet<>());


        // XỬ LÝ ẢNH CLOUD
        if (imageUrl != null && !imageUrl.isEmpty()) {
            post.setImageUrl(imageUrl);
            post.setMediaType("IMAGE");
        }

        Post savedPost = postRepository.save(post);
        PostResponse response = mapToDTO(savedPost, username);

        // Bắn Socket báo bài mới
        try {
            Map<String, Object> updateMsg = Map.of("type", "NEW_POST", "post", response);
            messagingTemplate.convertAndSend("/topic/feed", (Object) updateMsg);
        } catch (Exception e) { e.printStackTrace(); }

        return mapToDTO(savedPost, username);
    }

    // 2. Lấy danh sách bài viết
    public List<PostResponse> getAllPosts(String currentUsername) {
        User currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        Long currentUserId = (currentUser != null) ? currentUser.getId() : null;

        return postRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(post -> mapToDTO(post, currentUsername))
                .collect(Collectors.toList());
    }

    // 3. Like/Unlike
    public void toggleLike(Long postId, String username) {
        Post post = postRepository.findById(postId).orElseThrow();
        User user = userRepository.findByUsername(username).orElseThrow();

        if (post.getLikedUserIds() == null) {
            post.setLikedUserIds(new HashSet<>());
        }

        boolean isLiked;
        if (post.getLikedUserIds().contains(user.getId())) {
            post.getLikedUserIds().remove(user.getId());
            isLiked = false;
        } else {
            post.getLikedUserIds().add(user.getId());
            isLiked = true;
        }
        postRepository.save(post);

        try {
            Map<String, Object> updateMsg = Map.of(
                    "type", "LIKE_UPDATE",
                    "postId", postId,
                    "likeCount", post.getLikedUserIds().size()
            );
            messagingTemplate.convertAndSend("/topic/feed", (Object) updateMsg);
        } catch (Exception e){
            System.err.println("Lỗi gửi Socket: " + e.getMessage());
        }

        if (isLiked && !post.getUser().getUsername().equals(username)) {
            String content = user.getFullName() + " đã thích bài viết của bạn.";
            notificationService.createNotification(post.getUser().getUsername(), content, post.getId());
        }
    }

    // 4. Comment
    public void addComment(Long postId, String username, String content) {
        Post post = postRepository.findById(postId).orElseThrow();
        User user = userRepository.findByUsername(username).orElseThrow();

        Comment comment = new Comment();
        comment.setContent(content);
        comment.setUser(user);
        comment.setPost(post);

        comment.setCreatedAt(LocalDateTime.now());
        // --------------------------------------

        commentRepository.save(comment);

        try{
            Map<String, Object> commentData = Map.of(
                    "id", comment.getId(),
                    "content", comment.getContent(),
                    "username", user.getUsername(),
                    "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername(),
                    "avatar", user.getAvatar() != null ? user.getAvatar() : "",
                    "createdAt", comment.getCreatedAt().toString()
            );

            Map<String, Object> updateMsg = Map.of(
                    "type", "COMMENT_UPDATE",
                    "postId", postId,
                    "comment", commentData
            );
            messagingTemplate.convertAndSend("/topic/feed", (Object) updateMsg);
        } catch (Exception e){
            System.err.println("Lỗi Socket Comment: " + e.getMessage());
        }

        if (!post.getUser().getUsername().equals(username)) {
            String notiContent = user.getFullName() + " đã bình luận: " + content;
            notificationService.createNotification(post.getUser().getUsername(), notiContent, post.getId());
        }
    }

    // 5. Sửa bài viết
    public void updatePost(Long postId, String username, String newContent) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không chính chủ!");
        }
        post.setContent(newContent);
        postRepository.save(post);

        try {
            Map<String, Object> msg = Map.of(
                    "type", "POST_UPDATED",
                    "postId", postId,
                    "newContent", newContent
            );
            messagingTemplate.convertAndSend("/topic/feed", (Object) msg);
        } catch (Exception e) {
            System.err.println("Lỗi socket update: " + e.getMessage());
        }
    }

    // 6. Xóa bài viết
    public void deletePost(Long postId, String username) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không chính chủ!");
        }
        postRepository.delete(post);

        try {
            Map<String, Object> msg = Map.of("type", "POST_DELETED", "postId", postId);
            messagingTemplate.convertAndSend("/topic/feed", (Object) msg);
        } catch (Exception e) {
            System.err.println("Lỗi socket delete: " + e.getMessage());
        }
    }

    // 7. Lấy chi tiết
    public PostResponse getPostById(Long postId, String currentUsername) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found with id: " + postId));
        User currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        Long currentUserId = (currentUser != null) ? currentUser.getId() : null;
        return mapToDTO(post, currentUsername);
    }

    public void reactToPost(Long postId, String username, String reactionType) {
        Post post = postRepository.findById(postId).orElseThrow();
        User user = userRepository.findByUsername(username).orElseThrow();

        if (post.getReactions() == null) post.setReactions(new HashMap<>());

        String currentReaction = post.getReactions().get(username);
        boolean isAdding = false;

        // Logic Toggle:
        if (currentReaction != null && currentReaction.equals(reactionType)) {
            post.getReactions().remove(username); // Gỡ bỏ
        } else {
            post.getReactions().put(username, reactionType); // Thêm mới hoặc đổi icon
            isAdding = true;
        }

        postRepository.save(post);

        // 1. Bắn Socket cập nhật giao diện (PostCard tự nhảy số)
        try {
            messagingTemplate.convertAndSend("/topic/feed",
                    Optional.of(Map.of("type", "POST_REACTION_UPDATE", "postId", postId, "reactions", post.getReactions(), "likeCount", post.getLikeCount()))
            );
        } catch (Exception e) { e.printStackTrace(); }

        // 2. TẠO THÔNG BÁO (Đây là phần bạn đang thiếu!)
        // Chỉ báo nếu là hành động Thêm/Đổi (isAdding = true) và người thả không phải chủ bài viết
        if (isAdding && !post.getUser().getUsername().equals(username)) {
            String emoji = getEmojiIcon(reactionType);
            String content = user.getFullName() + " đã thả cảm xúc " + emoji + " vào bài viết của bạn.";

            // Gọi NotificationService để lưu DB và bắn Socket thông báo
            notificationService.createNotification(post.getUser().getUsername(), content, post.getId());
        }
    }

    // Hàm phụ để lấy icon đẹp (Optional)
    private String getEmojiIcon(String type) {
        switch (type) {
            case "LIKE": return "👍";
            case "LOVE": return "❤️";
            case "HAHA": return "😆";
            case "WOW": return "😮";
            case "SAD": return "😢";
            case "ANGRY": return "😡";
            default: return "bày tỏ cảm xúc";
        }
    }


    // Helper map DTO
    private PostResponse mapToDTO(Post post, String currentUsername) { // <--- 1. Đổi tham số từ Long ID sang String Username

        // Lấy thông tin từ Map reactions ---
        Map<String, String> reactions = post.getReactions();

        // Lấy số lượng (Hàm getLikeCount @Transient trong Entity đã tự tính size của map reactions)
        int likeCount = post.getLikeCount();

        // Kiểm tra xem user hiện tại có trong map reactions không
        boolean isLiked = false;
        if (currentUsername != null && reactions != null) {
            isLiked = reactions.containsKey(currentUsername);
        }
        // ------------------------------------------------

        List<Comment> comments = post.getComments();
        List<PostResponse.CommentDTO> commentDTOS = new ArrayList<>();

        if (comments != null) {
            commentDTOS = comments.stream()
                    .map(c -> new PostResponse.CommentDTO(
                            c.getId(),
                            c.getContent(),
                            c.getUser().getUsername(),
                            c.getUser().getFullName() != null ? c.getUser().getFullName() : c.getUser().getUsername(),
                            c.getUser().getAvatar(),
                            c.getCreatedAt()
                    )).collect(Collectors.toList());
        }

        // DÙNG BUILDER (An toàn hơn dùng Constructor)
        return PostResponse.builder()
                .id(post.getId())
                .content(post.getContent())
                .imageUrl(post.getImageUrl())
                .mediaType(post.getMediaType())
                .createdAt(post.getCreatedAt())

                // User Info
                .username(post.getUser().getUsername())
                .fullName(post.getUser().getFullName() != null ? post.getUser().getFullName() : post.getUser().getUsername())
                .userAvatar(post.getUser().getAvatar())

                .reactions(reactions)
                .likeCount(likeCount)
                .likedByMe(isLiked)

                .backgroundTheme(post.getBackgroundTheme())

                .comments(commentDTOS)
                .build();
    }
}