package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.ChangePasswordRequest;
import com.mosoftvn.chatbox.DTO.RegisterRequest;
import com.mosoftvn.chatbox.DTO.ResetPasswordRequest;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.DTO.AuthResponse;
import com.mosoftvn.chatbox.Service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.parameters.P;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    // Class nhận dữ liệu Login
    public static class LoginRequest {
        public String username;
        public String password;
    }

    // API Đăng ký
    @PostMapping("/register")
    public String register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }
    // API Xác thực OTP
    @PostMapping("/verify")
    public String verify(@RequestParam String email, @RequestParam String otp) {
        // Lưu ý: Logic verifyAccount bên service  username hay email
        return authService.verifyAccount(email, otp);
    }

    // API Đăng nhập
    @PostMapping("/login")
    public AuthResponse login(@RequestBody User request) {
        return authService.login(request.getUsername(), request.getPassword());
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng cung cấp email!");
        }

        try {

            authService.forgotPassword(email);
            return ResponseEntity.ok("Mã OTP đặt lại mật khẩu đã được gửi đến email của bạn.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestBody Map<String, String> request) {
        // 1. Tạo đối tượng ResetPasswordRequest từ dữ liệu gửi lên
        ResetPasswordRequest resetData = new ResetPasswordRequest();
        resetData.setEmail(request.get("email"));
        resetData.setOtp(request.get("otp"));
        resetData.setNewPassword(request.get("newPassword"));

        // 2. Truyền đối tượng này vào Service (Lúc này mới đúng kiểu dữ liệu)
        authService.resetPassword(resetData);

        return "Đổi mật khẩu thành công!";
    }

    @PostMapping("/change-password")
    public String changePassword(@RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return "Đổi mật khẩu thành công!";
    }

    @PostMapping("/logout")
    public String logout() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // --- LOG DEBUG ---
        System.out.println("LOG DEBUG: ---> API Logout được gọi!");
        if (auth == null) {
            System.out.println("LOG DEBUG: ---> Auth là NULL! (Lỗi Security)");
            return "Lỗi: Không tìm thấy user";
        }
        System.out.println("LOG DEBUG: ---> Người đang Logout là: " + auth.getName());
        // -----------------

        String username = auth.getName();
        authService.logout(username);

        return "Đăng xuất thành công!";
    }

    // API TEST: Chỉ ai có Token mới gọi được
    @GetMapping("/demo")
    public String demo() {
        return "Xin chào! Bạn đã vào được khu vực bảo mật bằng Token.";
    }
}