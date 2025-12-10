package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.UserUpdateDTO;
import com.mosoftvn.chatbox.DTO.UserSummary;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.UserRepository;
import com.mosoftvn.chatbox.Service.UserService;
import com.mosoftvn.chatbox.Service.CloudinaryService; // Nhớ import Service này
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private CloudinaryService cloudinaryService;

    // --- XÓA DÒNG NÀY ĐI: private final String UPLOAD_DIR = "uploads/"; ---

    @GetMapping
    public List<UserSummary> getAllUsers() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();
        return userService.getAllUsersExcept(currentUsername);
    }

    @PostMapping("/status")
    public void changeStatus(@RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        userRepository.findByUsername(username).ifPresent(user -> {
            user.setStatus(newStatus);
            userRepository.save(user);

            Map<String, String> updateMsg = Map.of(
                    "username", username,
                    "status", newStatus
            );
            messagingTemplate.convertAndSend("/topic/status", updateMsg);
        });
    }

    // --- API QUAN TRỌNG NHẤT: UPLOAD AVATAR ---
    @PostMapping("/{username}/avatar")
    public ResponseEntity<?> uploadAvatar(@PathVariable String username, @RequestParam("file") MultipartFile file) {
        try {
            // 1. Gọi Cloudinary Service
            // Hàm này sẽ tự upload và TRẢ VỀ LINK ẢNH (secure_url) ngay lập tức
            String fileUrl = cloudinaryService.uploadFile(file);

            // 2. Tìm User
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // 3. Lưu Link ảnh vào Database
            user.setAvatar(fileUrl);
            userRepository.save(user);

            // 4. Bắn Socket báo cập nhật (Giữ nguyên logic cũ)
            Map<String, Object> updateMsg = Map.of(
                    "type", "USER_UPDATE",
                    "username", username,
                    "newAvatar", fileUrl,
                    "newFullName", user.getFullName() != null ? user.getFullName() : username
            );
            messagingTemplate.convertAndSend("/topic/feed", (Object) updateMsg);

            // 5. Trả về Link ảnh cho Frontend hiển thị ngay
            return ResponseEntity.ok(fileUrl);

        } catch (RuntimeException e) {
            // Bắt lỗi từ CloudinaryService ném ra
            return ResponseEntity.badRequest().body("Lỗi upload ảnh: " + e.getMessage());
        }
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getProfile(@PathVariable String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{username}")
    public ResponseEntity<?> updateProfile(@PathVariable String username, @RequestBody UserUpdateDTO request) {
        User user = userService.findByUsername(username);

        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setDob(request.getDob());
        user.setHometown(request.getHometown());
        user.setPosition(request.getPosition());

        userService.save(user);

        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("type", "USER_UPDATE");
        updatePayload.put("username", username);
        updatePayload.put("newFullName", user.getFullName());
        updatePayload.put("newAvatar", user.getAvatar());
        updatePayload.put("data", user);

        messagingTemplate.convertAndSend("/topic/feed", (Object) updatePayload);

        return ResponseEntity.ok(user);
    }
}