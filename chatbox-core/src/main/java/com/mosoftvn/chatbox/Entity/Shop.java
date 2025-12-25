package com.mosoftvn.chatbox.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "shops")
@Data
public class Shop {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String shopName;      // Tên Shop
    private String address;       // Địa chỉ kho
    private String phoneNumber;   // SĐT liên hệ
    // Chuyển sang kiểu TEXT để lưu được đoạn văn dài vô tư
    @Column(columnDefinition = "TEXT")
    private String description;

    // URL ảnh có thể dài, tăng lên 1000 hoặc dùng TEXT
    @Column(length = 1000)
    private String avatarUrl;   // Logo shop (nếu có)

    // Liên kết 1-1 với User (Mỗi User chỉ có 1 Shop)
    @OneToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"shop", "password", "roles"}) // Tránh loop
    private User owner;
    // Thống kê nhanh (có thể tính toán hoặc lưu cứng)
    private Integer totalSold = 0;   // Tổng đơn đã bán
    private Double rating = 0.0;     // Điểm đánh giá trung bình


}