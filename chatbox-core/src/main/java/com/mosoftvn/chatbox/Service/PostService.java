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
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;

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

    private final String UPLOAD_DIR = "uploads/";

    // 1. Đăng bài mới
    public PostResponse createPost(String username, String content, MultipartFile file) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = new Post();
        post.setContent(content);
        post.setUser(user);

        // XỬ LÝ LƯU ẢNH
        if (file != null && !file.isEmpty()) {
            try {
                // Tạo tên file duy nhất
                String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();

                // Tạo đường dẫn lưu file
                Path path = Paths.get(UPLOAD_DIR + fileName);
                Files.createDirectories(path.getParent()); // Tạo thư mục uploads nếu chưa có
                Files.write(path, file.getBytes()); // Ghi file

                String fileUrl = "http://localhost:8081/images/" + fileName;
                post.setImageUrl(fileUrl);

                String mimeType = file.getContentType();
                if (mimeType != null && mimeType.startsWith("video")) {
                    post.setMediaType("VIDEO");
                }else{
                    post.setMediaType("IMAGE");
                }

            } catch (IOException e) {
                System.err.println("Lỗi lưu file: " + e.getMessage());
            }
        }


        Post savedPost = postRepository.save(post);
        PostResponse response = mapToDTO(savedPost, user.getId());

        // Bắn Socket báo bài mới
        try {
            Map<String, Object> updateMsg = Map.of("type", "NEW_POST", "post", response);
            messagingTemplate.convertAndSend("/topic/feed", (Object) updateMsg);
        } catch (Exception e) { e.printStackTrace(); }

        return response;
    }

    // 2. Lấy danh sách bài viết
    public List<PostResponse> getAllPosts(String currentUsername) {
        User currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        Long currentUserId = (currentUser != null) ? currentUser.getId() : null;

        return postRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(post -> mapToDTO(post, currentUserId))
                .collect(Collectors.toList());
    }

    // 3. Like/Unlike
    public void toggleLike(Long postId, String username) {
        Post post = postRepository.findById(postId).orElseThrow();
        User user = userRepository.findByUsername(username).orElseThrow();

        boolean isLiked;
        if (post.getLikedUserIds().contains(user.getId())) {
            post.getLikedUserIds().remove(user.getId());
            isLiked = false;
        } else {
            post.getLikedUserIds().add(user.getId());
            isLiked = true;
        }
        postRepository.save(post);

        // Gửi Real-time
        try {
            Map<String, Object> updateMsg = Map.of(
                    "type", "LIKE_UPDATE",
                    "postId", postId,
                    "likeCount", post.getLikedUserIds().size()
            );
            messagingTemplate.convertAndSend("/topic/feed", (Object) updateMsg);
        } catch (Exception e){
            System.err.println("Lỗi gửi Socket/Thông báo: " + e.getMessage());
        }

        // Nếu người like KHÔNG PHẢI là chủ bài viết -> Thì mới báo
        if (isLiked && !post.getUser().getUsername().equals(username)) {
            String content = user.getFullName() + " đã thích bài viết của bạn.";

            notificationService.createNotification(
                    post.getUser().getUsername(), // Gửi cho chủ bài viết
                    content,
                    post.getId()
            );
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
        commentRepository.save(comment);


        try{
            // Gửi Real-time
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
            System.err.println("Lỗi gửi Socket Comment: " + e.getMessage());
        }


        if (!post.getUser().getUsername().equals(username)) {
            String notiContent = user.getFullName() + " đã bình luận: " + content;
            notificationService.createNotification(
                    post.getUser().getUsername(),
                    notiContent,
                    post.getId()
            );
        }
    }


    // 6. Sửa bài viết
    public void updatePost(Long postId, String username, String newContent) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không chính chủ!");
        }
        post.setContent(newContent);
        postRepository.save(post);

        // BẮN TÍN HIỆU SỬA (Gửi cả nội dung mới về)
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

    public void deletePost(Long postId, String username) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không chính chủ!");
        }
        postRepository.delete(post);

        // BẮN TÍN HIỆU XÓA
        try {
            Map<String, Object> msg = Map.of("type", "POST_DELETED", "postId", postId);
            messagingTemplate.convertAndSend("/topic/feed", (Object) msg);
        } catch (Exception e) {
            System.err.println("Lỗi socket delete: " + e.getMessage());
        }
    }

    public PostResponse getPostById(Long postId, String currentUsername) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found with id: " + postId));

        User currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        Long currentUserId = (currentUser != null) ? currentUser.getId() : null;

        return mapToDTO(post, currentUserId);
    }
    // Hàm chuyển đổi DTO
    private PostResponse mapToDTO(Post post, Long currentUserId) {
        Set<Long> likes = post.getLikedUserIds();
        boolean isLiked = (likes != null && currentUserId != null) && likes.contains(currentUserId);
        int likeCount = (likes != null) ? likes.size() : 0;

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

        return new PostResponse(
                post.getId(),
                post.getContent(),
                post.getImageUrl(),
                post.getMediaType(),
                post.getCreatedAt(),
                post.getUser().getUsername(),
                post.getUser().getFullName() != null ? post.getUser().getFullName() : post.getUser().getUsername(),
                post.getUser().getAvatar(),
                likeCount,
                isLiked,
                commentDTOS
        );
    }
}