package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.UserUpdateDTO;
import com.mosoftvn.chatbox.DTO.UserSummary;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.UserRepository;
import com.mosoftvn.chatbox.Service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.io.File;
import java.io.IOException;
import java.nio.file.*;
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

    private final String UPLOAD_DIR = "uploads/";

    @GetMapping
    public List<UserSummary> getAllUsers() {
        // Lấy tên người đang đăng nhập từ Token
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

            // --- THÊM ĐOẠN NÀY: Gửi thông báo cho tất cả mọi người ---
            // Gửi một Map chứa: ai đổi? đổi thành gì?
            Map<String, String> updateMsg = Map.of(
                    "username", username,
                    "status", newStatus
            );

            // Gửi vào kênh /topic/status
            messagingTemplate.convertAndSend("/topic/status", updateMsg);
            System.out.println("LOG: Đã phát loa thông báo: " + username + " -> " + newStatus);
            // ---------------------------------------------------------
        });
    }

    @PostMapping("/{username}/avatar")
    public ResponseEntity<?> uploadAvatar(@PathVariable String username, @RequestParam("file") MultipartFile file) {
        try {
            // 1. Lưu file vào server
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path path = Paths.get(UPLOAD_DIR + fileName);
            Files.createDirectories(path.getParent());
            Files.write(path, file.getBytes());

            // 2. Tạo URL (cấu hình ResourceHandler để server phục vụ file này)
            String fileUrl = "http://localhost:8081/images/" + fileName;

            // 3. Cập nhật User trong DB
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            user.setAvatar(fileUrl);
            userRepository.save(user);

            // --- BẮN SOCKET BÁO CẬP NHẬT ---
            Map<String, Object> updateMsg = Map.of(
                    "type", "USER_UPDATE",
                    "username", username,
                    "newAvatar", fileUrl,
                    "newFullName", user.getFullName() != null ? user.getFullName() : username // Gửi kèm tên luôn cho chắc
            );

            // Gửi vào kênh /topic/feed (để Feed cập nhật) và /topic/status (để Chat list cập nhật)
            // Ta tận dụng kênh /topic/feed cho tiện vì Feed đang lắng nghe nó
            messagingTemplate.convertAndSend("/topic/feed", (Object) updateMsg);
            // ----------------------------------------------

            return ResponseEntity.ok(fileUrl);// Trả về URL mới
        } catch (IOException e) {
            return ResponseEntity.badRequest().body("Lỗi upload: " + e.getMessage());
        }
    }

    // API lấy thông tin Profile
    @GetMapping("/{username}")
    public ResponseEntity<?> getProfile(@PathVariable String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // Trả về DTO hoặc Map (tránh trả password)
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{username}")
    public ResponseEntity<?> updateProfile(@PathVariable String username, @RequestBody UserUpdateDTO request) {
        // 1. Tìm user (Giờ hàm này đã có trong Service rồi)
        User user = userService.findByUsername(username);

        // 2. Cập nhật thông tin từ Request
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setDob(request.getDob());
        user.setHometown(request.getHometown());
        user.setPosition(request.getPosition());

        // 3. Lưu xuống DB
        userService.save(user);

        // 4. BẮN SOCKET REAL-TIME (Để các máy khác thấy ngay sự thay đổi)
        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("type", "USER_UPDATE");
        updatePayload.put("username", username);
        // Gửi các thông tin quan trọng để cập nhật UI
        updatePayload.put("newFullName", user.getFullName());
        updatePayload.put("newAvatar", user.getAvatar());

        // Gửi gói data đầy đủ để Profile update
        // Lưu ý: Cần đảm bảo User entity không gây lỗi vòng lặp JSON (nếu có quan hệ 2 chiều)
        // Tốt nhất là map sang DTO, nhưng gửi tạm user cũng được nếu cấu hình ổn
        updatePayload.put("data", user);

        // Gửi vào kênh /topic/feed (vì Frontend đang lắng nghe kênh này để update avatar/tên)
        messagingTemplate.convertAndSend("/topic/feed", (Object) updatePayload);

        return ResponseEntity.ok(user);
    }






}