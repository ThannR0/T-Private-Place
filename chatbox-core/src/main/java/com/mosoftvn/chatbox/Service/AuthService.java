package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.ChangePasswordRequest;
import com.mosoftvn.chatbox.DTO.RegisterRequest;
import com.mosoftvn.chatbox.DTO.ResetPasswordRequest;
import com.mosoftvn.chatbox.Entity.Role;
import com.mosoftvn.chatbox.Entity.Transaction;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Config.JwtUtil;
import com.mosoftvn.chatbox.Repository.RoleRepository;
import com.mosoftvn.chatbox.Repository.TransactionRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import com.mosoftvn.chatbox.DTO.AuthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cglib.core.Local;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    @Autowired
    private TransactionRepository transactionRepository;


    // PasswordEncoder dùng để mã hóa và kiểm tra mật khẩu
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();



    // 1. Gửi OTP
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trong hệ thống"));

        // Tạo OTP ngẫu nhiên 6 số
        String otp = String.valueOf((int) ((Math.random() * 900000) + 100000));

        // Lưu OTP và set thời gian hết hạn là 5 phút
        user.setResetPasswordToken(otp);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        // Gửi mail (Tận dụng hàm gửi mail có sẵn)
        String subject = "Mã OTP đặt lại mật khẩu - T Private Place";
        String content = "Mã OTP của bạn là: " + otp + ". Mã này sẽ hết hạn sau 5 phút.";

        emailService.sendEmail(email, "Quên mật khẩu T Private Place", content);
    }

    // 2. Xác thực OTP và Đổi mật khẩu
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        // Kiểm tra OTP có khớp không
        if (user.getResetPasswordToken() == null || !user.getResetPasswordToken().equals(request.getOtp())) {
            throw new RuntimeException("Mã OTP không chính xác");
        }

        // Kiểm tra OTP còn hạn không
        if (user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã OTP đã hết hạn");
        }

        // Đổi mật khẩu mới
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        // Xóa token sau khi dùng xong để bảo mật
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);

        userRepository.save(user);
    }

    public void changePassword(ChangePasswordRequest request) {
        // Dùng findByUsername vì Frontend gửi username vào biến email
        User user = userRepository.findByUsername(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng!"));

        // Kiểm tra mật khẩu cũ có khớp với trong Database không
        // passwordEncoder.matches(mật_khẩu_nhập_vào, mật_khẩu_đã_mã_hóa_trong_db)
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác!");
        }

        // Mã hóa mật khẩu mới và lưu lại
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // Sửa tham số từ (User userRequest) thành (RegisterRequest request)
    public String register(RegisterRequest request) {

        // 1. Kiểm tra tồn tại
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại!");
        }
        // (Đã xóa check email trùng theo yêu cầu trước đó)

        // 2. Xử lý Role
        Role role = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_USER")));

        // 3. Tạo User mới từ Request
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setEmail(request.getEmail());
        newUser.setFullName(request.getFullName());

        // Lưu FullName (Nếu null thì lấy username làm tên tạm)
        newUser.setFullName(request.getFullName() != null ? request.getFullName() : request.getUsername());

        newUser.setPassword(passwordEncoder.encode(request.getPassword())); // Mã hóa pass
        newUser.setRole(role);
        newUser.setEnabled(false);

        // 4. Sinh OTP
        String otp = String.valueOf(new Random().nextInt(900000) + 100000);
        newUser.setOtpCode(otp);
        newUser.setOtpExpiration(LocalDateTime.now().plusMinutes(5));

        // 5. Lưu và Gửi mail
        userRepository.save(newUser);
        emailService.sendOtpEmail(newUser.getEmail(), otp);

        return "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.";
    }

    // --- XÁC THỰC OTP ---
    public String verifyAccount(String email, String otpCode) {
        // Tìm user theo email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trong hệ thống"));

        // Kiểm tra mã OTP
        if (user.getOtpCode() == null || !user.getOtpCode().equals(otpCode)) {
            throw new RuntimeException("Mã OTP không đúng");
        }

        // Kiểm tra hết hạn
        if (user.getOtpExpiration().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã OTP đã hết hạn");
        }

        // Kích hoạt tài khoản
        user.setEnabled(true);
        user.setOtpCode(null);
        userRepository.save(user);

        return "Xác thực thành công! Bạn có thể đăng nhập.";
    }

    // login

    public AuthResponse login(String username, String password) {
        // 1. Kiểm tra tài khoản
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        // 2. Kiểm tra mật khẩu
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Sai mật khẩu!");
        }

        // 3. Kiểm tra kích hoạt
        if (!user.isEnabled()) {
            throw new RuntimeException("Tài khoản chưa được kích hoạt! Vui lòng kiểm tra email.");
        }

        // 🟢 4. LẤY ROLE RA TRƯỚC (Để đưa vào Token)
        // Lưu ý: Đảm bảo user.getRole() trả về đúng tên role (VD: "ADMIN", "USER")
        String roleName = (user.getRole() != null) ? user.getRole().getName() : "USER";

        // 🟢 5. TẠO TOKEN KÈM ROLE (Hàm mới sửa bên JwtUtil)
        String token = jwtUtil.generateToken(username, roleName);

        // 6. Cập nhật trạng thái Online
        userService.updateUserStatus(username, "ONLINE");

        // 7. Lấy tên hiển thị
        String displayName = (user.getFullName() != null && !user.getFullName().isEmpty())
                ? user.getFullName()
                : user.getUsername();

        // 8. Tính tổng tiền nạp (Giữ nguyên logic của bạn)
        Double totalDeposited = java.util.Optional.ofNullable(
                transactionRepository.sumTotalIncomingMoney(user.getId())
        ).orElse(0.0);

        // 9. Trả về kết quả
        return new AuthResponse(token, user.getUsername(), displayName, user.getAvatar(), roleName, user.getBalance(), totalDeposited);
    }

    public void logout(String username) {
        // Khi đăng xuất -> Set OFFLINE ngay lập tức
        userService.updateUserStatus(username, "OFFLINE");
    }
}