package com.mosoftvn.chatbox.DTO;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

public class PaymentDTO {

    @Data
    public static class DepositRequest {
        private Double amount; // Số tiền VND
        private String method; // VNPAY, MOMO, BANK
        private String type;   // "DEPOSIT" hoặc "DONATE"
    }

    @Data
    @Builder
    public static class TransactionResponse {
        private Long id;
        private String transactionCode;
        private Double amountVnd;
        private Double thanReceived;
        private String type;
        private String status;
        private String qrUrl;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class MonthlyStat {
        private String month; // "2023-10"
        private Double totalAmount;
    }
}