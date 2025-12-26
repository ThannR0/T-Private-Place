package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
@Data
public class Voucher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    private String description; // Mô tả (VD: Thưởng thăng hạng Gold)

    // Nếu voucher giảm theo % (VD: 0.1 là 10%)
    private Double discountPercent;

    // Nếu voucher giảm theo tiền mặt (VD: 50000 VND)
    private Double discountAmount;

    // Đơn hàng tối thiểu để dùng voucher (VD: 0đ)
    private Double minOrderAmount;

    private Integer usageLimit; // Giới hạn số lần dùng (VD: 1)

    private Integer usedCount;  // Số lần đã dùng

    @Column(columnDefinition = "boolean default false")
    private boolean deletedByUser = false;

    @Column(name = "is_active")
    private Boolean isActive;   // Trạng thái kích hoạt


    // Đổi tên expiryDate -> expirationDate để khớp với logic Service cũ
    private LocalDateTime expirationDate;

    private boolean isUsed; // Có thể giữ lại hoặc dùng logic (usedCount >= usageLimit)

    @ManyToOne
    @JoinColumn(name = "user_id") // Sửa tên cột cho rõ ràng
    private User owner;
}