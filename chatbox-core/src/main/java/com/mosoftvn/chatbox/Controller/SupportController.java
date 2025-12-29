package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.Entity.SupportTicket;
import com.mosoftvn.chatbox.Entity.TicketStatus;
import com.mosoftvn.chatbox.Service.SupportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    @Autowired
    private SupportService supportService;

    // --- PHẦN CHO USER ---

    // 1. Tạo yêu cầu hỗ trợ
    @PostMapping("/create")
    public ResponseEntity<?> createTicket(@RequestBody SupportTicket ticket) {
        try {
            // Tự động lấy username từ Token đang đăng nhập
            String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            ticket.setUserId(currentUsername);

            SupportTicket newTicket = supportService.createTicket(ticket);
            return ResponseEntity.ok(newTicket);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi tạo ticket: " + e.getMessage());
        }
    }

    // 2. Xem lịch sử yêu cầu của mình
    @GetMapping("/my-tickets")
    public ResponseEntity<List<SupportTicket>> getMyTickets() {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(supportService.getUserTickets(currentUsername));
    }

    // --- PHẦN CHO ADMIN ---

    // 3. Lấy tất cả ticket (Admin)
    @GetMapping("/admin/all")
    public ResponseEntity<List<SupportTicket>> getAllTickets() {
        return ResponseEntity.ok(supportService.getAllTickets());
    }

    // 4. Admin phản hồi và cập nhật trạng thái
    @PutMapping("/admin/reply/{id}")
    public ResponseEntity<?> replyTicket(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            String response = payload.get("response");
            String statusStr = payload.get("status");
            TicketStatus status = TicketStatus.valueOf(statusStr); // Chuyển chuỗi sang Enum

            supportService.replyTicket(id, response, status);
            return ResponseEntity.ok("Đã phản hồi và gửi mail cho user!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi xử lý: " + e.getMessage());
        }
    }

    @PutMapping("/user/reply/{id}")
    public ResponseEntity<?> userReply(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            supportService.userReplyTicket(id, payload.get("message"));
            return ResponseEntity.ok("Đã gửi phản hồi cho Admin!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }
}