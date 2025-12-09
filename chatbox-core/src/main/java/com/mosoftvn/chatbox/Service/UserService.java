package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.UserSummary;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // 1. Lấy danh sách user (trừ bản thân)
    public List<UserSummary> getAllUsersExcept(String username) {
        return userRepository.findAll().stream()
                .filter(u -> !u.getUsername().equals(username))
                .map(u -> new UserSummary(
                        u.getId(),
                        u.getUsername(),
                        u.getFullName(),
                        u.getAvatar(),
                        u.getStatus() != null ? u.getStatus() : "OFFLINE"
                ))
                .collect(Collectors.toList());
    }

    // 2. Cập nhật trạng thái Online/Offline
    public void updateUserStatus(String username, String status) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setStatus(status);
            userRepository.save(user);

            // Gửi thông báo Real-time cho mọi người
            Map<String, String> updateMsg = Map.of(
                    "username", username,
                    "status", status
            );
            messagingTemplate.convertAndSend("/topic/status", updateMsg);
        });
    }

    // --- CÁC HÀM MỚI CẦN THÊM ĐỂ FIX LỖI ---

    // 3. Tìm User theo username (Trả về User hoặc ném lỗi)
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));
    }

    // 4. Lưu thông tin User (Dùng cho update profile)
    public User save(User user) {
        return userRepository.save(user);
    }
}