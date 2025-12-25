package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Data
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user; // Người đánh giá

    private Integer rating; // 1 -> 5 sao
    private String comment;

    private LocalDateTime createdAt = LocalDateTime.now();
}