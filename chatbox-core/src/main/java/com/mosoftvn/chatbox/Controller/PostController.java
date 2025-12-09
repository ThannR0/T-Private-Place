package com.mosoftvn.chatbox.Controller;
import com.mosoftvn.chatbox.DTO.PostResponse;
import com.mosoftvn.chatbox.Entity.Post;
import com.mosoftvn.chatbox.Repository.UserRepository;
import com.mosoftvn.chatbox.Service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType; // Nhớ import
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    @Autowired
    private PostService postService;

    private UserRepository userRepository;

    @GetMapping
    public List<PostResponse> getNewsfeed() {
        // Lấy user hiện tại để check like
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
        // Lấy user hiện tại để check xem user đó đã like bài này chưa
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


    // API: Đăng bài viết mới (Hỗ trợ upload ảnh)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse createPost(
            @RequestParam("content") String content,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        // 1. Lấy người dùng hiện tại từ Token
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        // 2. Gọi Service với đúng kiểu dữ liệu (String, String, MultipartFile)
        return postService.createPost(username, content, file);
    }

}
