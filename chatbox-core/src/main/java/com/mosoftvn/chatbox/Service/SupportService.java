package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.Entity.*;
import com.mosoftvn.chatbox.Entity.TicketPriority;
import com.mosoftvn.chatbox.Entity.TicketStatus;
import com.mosoftvn.chatbox.Repository.SupportTicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SupportService {

    @Autowired
    private SupportTicketRepository ticketRepo;

    @Autowired
    private EmailService emailService; // 🟢 Tận dụng file bạn đã có

    // Email của Admin (Cố định theo yêu cầu)
    private final String ADMIN_EMAIL = "rogamgu@gmail.com";

    // 1. TẠO TICKET & GỬI MAIL ADMIN
    public SupportTicket createTicket(SupportTicket ticket) {
        // Set mặc định khi mới tạo
        ticket.setStatus(TicketStatus.OPEN);
        if (ticket.getPriority() == null) ticket.setPriority(TicketPriority.MEDIUM);

        // Lưu vào DB
        SupportTicket savedTicket = ticketRepo.save(ticket);

        // 🟢 Gửi Email thông báo cho Admin
        String subject = "[Support] Yêu cầu mới #" + savedTicket.getId() + ": " + savedTicket.getTitle();
        String content = String.format("""
                Chào Admin,
                
                Có một yêu cầu hỗ trợ mới từ người dùng: %s
                Email liên hệ: %s
                
                Loại vấn đề: %s
                Mức độ: %s
                
                Nội dung chi tiết:
                %s
                
                Vui lòng kiểm tra trang quản trị để xử lý.
                """,
                ticket.getUserId(),
                ticket.getUserEmail(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getDescription()
        );

        // Gọi hàm sendEmail có sẵn của bạn
        emailService.sendEmail(ADMIN_EMAIL, subject, content);

        return savedTicket;
    }

    // 2. ADMIN TRẢ LỜI & CẬP NHẬT TRẠNG THÁI
    public SupportTicket replyTicket(Long ticketId, String response, TicketStatus newStatus) {
        SupportTicket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ticket"));

        ticket.setAdminResponse(response);
        ticket.setStatus(newStatus);

        SupportTicket updatedTicket = ticketRepo.save(ticket);

        // 🟢 Gửi Email báo cho User biết là Admin đã trả lời
        if (ticket.getUserEmail() != null && !ticket.getUserEmail().isEmpty()) {
            String subject = "[Chatbox] Phản hồi yêu cầu hỗ trợ #" + ticket.getId();
            String content = String.format("""
                    Chào bạn,
                    
                    Admin đã phản hồi về vấn đề "%s" của bạn.
                    
                    Nội dung phản hồi:
                    %s
                    
                    Trạng thái hiện tại: %s
                    
                    Cảm ơn bạn đã sử dụng dịch vụ!
                    """, ticket.getTitle(), response, newStatus);

            emailService.sendEmail(ticket.getUserEmail(), subject, content);
        }

        return updatedTicket;
    }

    public List<SupportTicket> getAllTickets() {
        return ticketRepo.findAll();
    }

    public List<SupportTicket> getUserTickets(String userId) {
        return ticketRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // 3. USER PHẢN HỒI LẠI (Re-open ticket)
    public SupportTicket userReplyTicket(Long ticketId, String userMessage) {
        SupportTicket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ticket"));

        // Cộng dồn nội dung cũ để lưu lịch sử
        String history = (ticket.getDescription() == null ? "" : ticket.getDescription())
                + "\n\n--- [" + LocalDateTime.now() + "] User phản hồi: ---\n" + userMessage;

        ticket.setDescription(history);

        // Quan trọng: Nếu vé đang Đóng/Xong thì mở lại để Admin thấy
        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED) {
            ticket.setStatus(TicketStatus.OPEN);
        }

        ticketRepo.save(ticket);

        // Gửi mail báo Admin ngay
        String subject = "[RE-OPEN] User phản hồi Ticket #" + ticket.getId();
        emailService.sendEmail(ADMIN_EMAIL, subject,
                "User " + ticket.getUserId() + " vừa phản hồi lại:\n\n" + userMessage + "\n\nVui lòng kiểm tra lại.");

        return ticket;
    }
}