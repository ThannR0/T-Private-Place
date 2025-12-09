package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    private String fullName;

    private String status;

    @Column(nullable = false)
    private String password;

    @Column(unique = true, nullable = false)
    private String email;

    // --- THÊM 2 TRƯỜNG NÀY ---
    @Column(name = "otp_code")
    private String otpCode;

    @Column(name = "otp_expiration")
    private LocalDateTime otpExpiration;

    @Column(name = "avatar")
    private String avatar;

    @Column(name = "phone")
    private String phone;

    @Column(name = "dob")
    private LocalDate dob; // Import java.time.LocalDate

    @Column(name = "hometown")
    private String hometown;

    @Column(name = "position")
    private String position;

    private boolean enabled = false; // Chưa kích hoạt (cần OTP)
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private Role role;

    @Column(name = "reset_password_token")
    private String resetPasswordToken;

    @Column(name = "reset_password_token_expiry")
    private LocalDateTime resetPasswordTokenExpiry;

    // Constructor
    public User() {}

//    // Getter & Setter (Bắt buộc phải có đủ)
//    public Long getId() { return id; }
//    public void setId(Long id) { this.id = id; }
//
//    public String getUsername() { return username; }
//    public void setUsername(String username) { this.username = username; }
//
//    public String getFullName() { return fullName; }
//    public void setFullName(String fullName) { this.fullName = fullName; }
//
//    public String getPassword() { return password; }
//    public void setPassword(String password) { this.password = password; }
//
//    public String getEmail() { return email; }
//    public void setEmail(String email) { this.email = email; }
//
//    public String getAvatar() { return avatar; }
//    public void setAvatar(String avatar) { this.avatar = avatar; }
//
//    public boolean isEnabled() { return enabled; }
//    public void setEnabled(boolean enabled) { this.enabled = enabled; }
//
//    public Role getRole() { return role; }
//    public void setRole(Role role) { this.role = role; }
//
//    public String getOtpCode() { return otpCode; }
//    public void setOtpCode(String otpCode) { this.otpCode = otpCode; }
//
//    public LocalDateTime getOtpExpiration() { return otpExpiration; }
//    public void setOtpExpiration(LocalDateTime otpExpiration) { this.otpExpiration = otpExpiration; }
}