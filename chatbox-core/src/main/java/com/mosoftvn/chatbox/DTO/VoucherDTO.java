package com.mosoftvn.chatbox.DTO;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class VoucherDTO {
    private String code;
    private String description;

    private Double discountPercent;
    private Double discountAmount;
    private Double minOrderAmount;

    private Integer usageLimit;

    private LocalDateTime expiryDate; // Khớp tên với Entity

    private String ownerUsername; // Người được tặng (nếu null là voucher chung)
    private Boolean isActive;

}