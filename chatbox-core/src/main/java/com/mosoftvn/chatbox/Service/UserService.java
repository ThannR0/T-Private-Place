package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.UserSummary;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired private VoucherService voucherService;

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

    // Hàm xử lý nạp tiền thành công
    public void handleSuccessfulDeposit(User user, Double depositAmount) {
        Double oldTotal = user.getTotalDeposited() == null ? 0.0 : user.getTotalDeposited();

        // 1. Cộng tiền
        user.setBalance(user.getBalance() + depositAmount);
        user.setTotalDeposited(oldTotal + depositAmount);
        userRepository.save(user);

        // 2. Kiểm tra thăng cấp & Tặng quà
        checkAndRewardLevelUp(user, oldTotal, user.getTotalDeposited());
    }

    // Logic kiểm tra các mốc
    public void checkAndRewardLevelUp(User user, Double oldTotal, Double newTotal) {
        // Cấu hình mốc tiền (Khớp với file VoucherService)
        double BRONZE = 500_000;
        double SILVER = 5_000_000;
        double GOLD = 15_000_000;
        double PLATINUM = 80_000_000;
        double DIAMOND = 250_000_000;
        double TITANIUM = 1_000_000_000;

        String newLevelReached = "";

        if (oldTotal < BRONZE && newTotal >= BRONZE) {
            voucherService.createLevelUpVoucher(user, "BRONZE", 0.03); // 3%
            newLevelReached = "BRONZE";
        }
        if (oldTotal < SILVER && newTotal >= SILVER) {
            voucherService.createLevelUpVoucher(user, "SILVER", 0.05); // 5%
            newLevelReached = "SILVER";
        }
        if (oldTotal < GOLD && newTotal >= GOLD) {
            voucherService.createLevelUpVoucher(user, "GOLD", 0.10); // 10%
            newLevelReached = "GOLD";
        }
        if (oldTotal < PLATINUM && newTotal >= PLATINUM) {
            voucherService.createLevelUpVoucher(user, "PLATINUM", 0.15); // 15%
            newLevelReached = "PLATINUM";
        }
        if (oldTotal < DIAMOND && newTotal >= DIAMOND) {
            voucherService.createLevelUpVoucher(user, "DIAMOND", 0.25); // 25%
            newLevelReached = "DIAMOND";
        }
        if (oldTotal < TITANIUM && newTotal >= TITANIUM) {
            voucherService.createLevelUpVoucher(user, "TITANIUM", 0.35); // 35%
            newLevelReached = "TITANIUM";
        }

        // 🟢 GỬI SOCKET REALTIME NẾU CÓ LÊN CẤP 🟢
        if (!newLevelReached.isEmpty()) {
            // Tạo payload gửi xuống
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "LEVEL_UP");
            payload.put("level", newLevelReached);
            payload.put("message", "Chúc mừng bạn đã thăng hạng " + newLevelReached);

            // Gửi vào kênh riêng của user: /user/{username}/queue/levelup
            messagingTemplate.convertAndSendToUser(
                    user.getUsername(),
                    "/queue/levelup",
                    payload
            );

            System.out.println("Đã gửi thông báo lên cấp cho: " + user.getUsername());
        }
    }

    // 4. Lưu thông tin User (Dùng cho update profile)
    public User save(User user) {
        return userRepository.save(user);
    }
}