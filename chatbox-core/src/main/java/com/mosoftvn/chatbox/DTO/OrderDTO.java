package com.mosoftvn.chatbox.DTO;

import lombok.Data;

@Data
public class OrderDTO {
    private Long productId;
    private Integer quantity;
    private String voucherCode;
    private String address; // Địa chỉ nhận hàng
}