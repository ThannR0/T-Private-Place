package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.PaymentDTO;
import com.mosoftvn.chatbox.Service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    // 1. Tạo giao dịch nạp/donate (Trả về QR Code)
    @PostMapping("/create")
    public PaymentDTO.TransactionResponse create(@RequestBody PaymentDTO.DepositRequest req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return paymentService.createTransaction(username, req);
    }

    // 2. Lấy lịch sử giao dịch
    @GetMapping("/history")
    public List<PaymentDTO.TransactionResponse> getHistory() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return paymentService.getHistory(username);
    }

    // 3. Thống kê theo tháng
    @GetMapping("/stats")
    public List<PaymentDTO.MonthlyStat> getStats() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return paymentService.getMonthlyStats(username);
    }

    // 4. API DUYỆT GIAO DỊCH (Dành cho Admin hoặc Demo tự sướng)
    // Trong thực tế, bạn sẽ dùng cái này để test chức năng "Thành công"
    @PostMapping("/confirm/{code}")
    public void confirm(@PathVariable String code) {
        // Có thể thêm check quyền Admin ở đây
        paymentService.confirmTransaction(code);
    }

    @PostMapping("/webhook/fake-bank-callback")
    public ResponseEntity<?> fakeBankCallback(@RequestBody Map<String, String> payload) {
        String code = payload.get("content"); // Nội dung chuyển khoản (Mã GD)
        //thực tế, bạn cần check cả số tiền chuyển vào có khớp không

        try {
            paymentService.processPaymentSuccess(code, 0.0); // 0.0 là demo, service sẽ lấy theo DB
            return ResponseEntity.ok("Đã xử lý thành công");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}