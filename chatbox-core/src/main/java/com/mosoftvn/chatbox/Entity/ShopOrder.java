package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "shop_orders")
@Data
public class ShopOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String orderCode; // Mã đơn hàng (VD: ORD_17123...)

    @ManyToOne
    @JoinColumn(name = "buyer_id")
    private User buyer;

    @ManyToOne
    @JoinColumn(name = "seller_id")
    private User seller;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderItem> items;

    private Double totalAmount; // Tổng tiền hàng
    private Double discountAmount; // Giảm giá
    private Double finalAmount; // Thực trả

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    private String shippingAddress; // Địa chỉ nhận
    private String note; // Ghi chú mua hàng

    @ManyToOne
    @JoinColumn(name = "shop_id")
    private Shop shop;

    private LocalDateTime orderDate;
    private LocalDateTime completedDate;
}