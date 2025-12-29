package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "support_tickets")
public class SupportTicket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Thông tin người gửi
    private String userId;      // Username người dùng (lấy từ Token)
    private String userEmail;   // Email người dùng (để Admin reply)

    // Nội dung vấn đề
    private String title;

    @Column(columnDefinition = "TEXT") // Cho phép viết dài
    private String description;

    // Phân loại (Lưu dưới dạng String trong DB cho dễ nhìn)
    @Enumerated(EnumType.STRING)
    private com.mosoftvn.chatbox.Entity.TicketCategory category;

    @Enumerated(EnumType.STRING)
    private com.mosoftvn.chatbox.Entity.TicketStatus status;

    @Enumerated(EnumType.STRING)
    private com.mosoftvn.chatbox.Entity.TicketPriority priority;

    // Phản hồi của Admin (Lưu lại để hiển thị cho User xem)
    @Column(columnDefinition = "TEXT")
    private String adminResponse;

    private String userAvatar;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;


}