package com.mosoftvn.chatbox.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "products")
@Data
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 5000)
    private String description;

    @Column(nullable = false)
    private Double price; // Giá (Than)

    @Column(nullable = false)
    private Integer quantity; // Tồn kho

    private String category; // Danh mục

    @ElementCollection // List ảnh (URL)
    private List<String> images;

    @Enumerated(EnumType.STRING)
    private ProductStatus status; // PENDING, APPROVED, REJECTED, HIDDEN

    @ManyToOne
    @JoinColumn(name = "seller_id")
    private User seller;

    @ManyToOne
    @JoinColumn(name = "shop_id")
    @JsonIgnoreProperties({"owner", "products"}) // Chỉ lấy thông tin cơ bản của shop
    private Shop shop;

    private Double shippingFee = 0.0;

    private Integer sold = 0;

    private Double rating = 0.0;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = ProductStatus.PENDING;
    }
}