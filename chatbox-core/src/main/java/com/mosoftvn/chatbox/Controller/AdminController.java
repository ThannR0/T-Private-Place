package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.PaymentDTO;
import com.mosoftvn.chatbox.Entity.*;
import com.mosoftvn.chatbox.Repository.RoleRepository;
import com.mosoftvn.chatbox.Repository.TransactionRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import com.mosoftvn.chatbox.Service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder; // Để mã hóa pass nếu tạo mới
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TransactionRepository transactionRepository;

    // --- 1. QUẢN LÝ GIAO DỊCH (CODE CŨ) ---
    @GetMapping("/transactions")
    public List<PaymentDTO.TransactionResponse> getAllTransactions() {
        return paymentService.getAllTransactions();
    }

    // Duyệt tiền (Dời từ PaymentController sang đây cho bảo mật)
    @PostMapping("/confirm/{code}")
    public void confirmTransaction(@PathVariable String code) {
        paymentService.confirmTransaction(code);
    }

    // Từ chối
    @PostMapping("/reject/{code}")
    public void rejectTransaction(@PathVariable String code) {
        paymentService.rejectTransaction(code);
    }

    // A. Lấy danh sách tất cả User
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // B. Xóa User
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok().body(Map.of("message", "Xóa thành công"));
    }

    // C. Cập nhật thông tin User (Không đổi password ở đây)
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Cập nhật các trường cơ bản
        if (payload.containsKey("fullName")) user.setFullName((String) payload.get("fullName"));
        if (payload.containsKey("email")) user.setEmail((String) payload.get("email"));
        if (payload.containsKey("balance")) {
            // Xử lý số có thể là Integer hoặc Double từ JSON
            Object balanceObj = payload.get("balance");
            if (balanceObj instanceof Number) {
                user.setBalance(((Number) balanceObj).doubleValue());
            }
        }
        if (payload.containsKey("enabled")) user.setEnabled((Boolean) payload.get("enabled"));

        // Cập nhật Role (Quan trọng)
        if (payload.containsKey("role")) {
            String roleName = (String) payload.get("role"); // Frontend gửi "ROLE_ADMIN" hoặc "ROLE_USER"
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
            user.setRole(role);
        }

        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/users/{id}/add-coin")
    public ResponseEntity<?> addCoinToUser(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        // Xử lý số tiền (ép kiểu an toàn)
        Double amount = 0.0;
        if (payload.get("amount") instanceof Number) {
            amount = ((Number) payload.get("amount")).doubleValue();
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy User id: " + id));

        // 1. CỘNG TIỀN VÀO VÍ (Balance)
        Double newBalance = (user.getBalance() == null ? 0.0 : user.getBalance()) + amount;
        user.setBalance(newBalance);
        userRepository.save(user);

        // 2. GHI LỊCH SỬ GIAO DỊCH (Để tính VIP & Hiển thị lịch sử)
        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setAmountVnd(amount);    // Số tiền quy đổi (để tính VIP)
        tx.setThanReceived(amount); // Số Coin nhận được

        // 🟢 Đặt loại là ADMIN_ADD để dễ phân biệt
        tx.setType(TransactionType.ADMIN_ADD);
        tx.setStatus(TransactionStatus.SUCCESS);

        // Tạo mã giao dịch ngẫu nhiên
        tx.setTransactionCode("ADM" + System.currentTimeMillis());
        tx.setCreatedAt(LocalDateTime.now());

        transactionRepository.save(tx);

        return ResponseEntity.ok(Map.of(
                "message", "Đã cộng " + amount + " coin thành công!",
                "newBalance", newBalance
        ));
    }

    // D. Tạo User mới từ Admin (Optional - nếu bạn muốn admin tạo tay)
    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> payload) {
        if (userRepository.existsByUsername(payload.get("username"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username đã tồn tại"));
        }

        User newUser = new User();
        newUser.setUsername(payload.get("username"));
        newUser.setFullName(payload.get("fullName"));
        newUser.setEmail(payload.get("email"));
        newUser.setPassword(passwordEncoder.encode(payload.get("password"))); // Mã hóa pass
        newUser.setEnabled(true); // Admin tạo thì kích hoạt luôn
        newUser.setBalance(0.0);

        // Set Role
        String roleName = payload.getOrDefault("role", "ROLE_USER");
        Role role = roleRepository.findByName(roleName).orElse(null);
        newUser.setRole(role);

        userRepository.save(newUser);
        return ResponseEntity.ok(newUser);
    }
}
