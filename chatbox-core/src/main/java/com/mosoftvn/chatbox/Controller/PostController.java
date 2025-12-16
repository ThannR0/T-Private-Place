package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.PostResponse;
import com.mosoftvn.chatbox.Entity.Post;
import com.mosoftvn.chatbox.Repository.PostRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import com.mosoftvn.chatbox.Service.CloudinaryService;
import com.mosoftvn.chatbox.Service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "*")
public class PostController {

    @Autowired
    private PostService postService;

    // (Nếu không dùng UserRepository ở đây thì có thể xóa dòng này cho gọn)
    // @Autowired
    // private UserRepository userRepository;
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    @GetMapping
    public List<PostResponse> getNewsfeed() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return postService.getAllPosts(username);
    }

    @PostMapping("/{postId}/like")
    public void likePost(@PathVariable Long postId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        postService.toggleLike(postId, username);
    }

    @PostMapping("/{postId}/comments")
    public void addComment(@PathVariable Long postId, @RequestBody Map<String, String> body) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        postService.addComment(postId, username, body.get("content"));
    }

    @GetMapping("/{postId}")
    public PostResponse getPostById(@PathVariable Long postId) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        return postService.getPostById(postId, currentUsername);
    }

    @PutMapping("/{postId}")
    public void updatePost(@PathVariable Long postId, @RequestBody Map<String, String> body) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        postService.updatePost(postId, currentUsername, body.get("content"));
    }

    @DeleteMapping("/{postId}")
    public void deletePost(@PathVariable Long postId) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        postService.deletePost(postId, currentUsername);
    }

    @PostMapping("/{postId}/react")
    public ResponseEntity<?> reactToPost(@PathVariable Long postId, @RequestBody Map<String, String> body) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        String type = body.get("type");

        // Gọi hàm mới bên Service (Nơi đã có đủ logic thông báo)
        postService.reactToPost(postId, currentUser, type);

        return ResponseEntity.ok("Success");
    }

    // --- PHẦN SỬA ĐỔI QUAN TRỌNG ---
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse createPost(
            @RequestParam("content") String content,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "backgroundTheme", required = false) String backgroundTheme
    ) {
        System.out.println("👉 CONTROLLER NHẬN ĐƯỢC THEME: " + backgroundTheme);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        // 1. Upload lên Cloud (Nếu có file)
        String imageUrl = null;
        if (file != null && !file.isEmpty()) {
            // Upload và lấy về link https://res.cloudinary.com/...
            imageUrl = cloudinaryService.uploadFile(file);
        }

        // 2. Gọi Service và truyền LINK ẢNH (String) thay vì file gốc
        // LƯU Ý: Bạn cần qua file PostService sửa lại tham số đầu vào nhé!
        return postService.createPost(username, content, imageUrl, backgroundTheme);
    }
}