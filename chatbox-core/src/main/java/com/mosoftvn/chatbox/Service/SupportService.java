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
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(LocalDateTime.now());
        SupportTicket saved = ticketRepo.save(ticket);
        System.out.println("DEBUG EMAIL: Đang kiểm tra để gửi mail...");
        System.out.println("DEBUG EMAIL: Email nhận được là: " + ticket.getUserEmail());
        // 2. Gửi mail xác nhận cho USER
        // Kiểm tra xem user có email không (được truyền từ frontend xuống hoặc query từ User Entity)
        if (ticket.getUserEmail() != null && !ticket.getUserEmail().isEmpty()) {
            String subject = "[Chatbox AI] Xác nhận yêu cầu hỗ trợ #" + saved.getId();
            String content = "Chào " + ticket.getUserId() + ",\n\n" +
                    "Chúng tôi đã nhận được yêu cầu: " + ticket.getTitle() + "\n" +
                    "Đội ngũ kỹ thuật sẽ kiểm tra và phản hồi sớm nhất.\n\n" +
                    "Trân trọng,";

            // Chạy bất đồng bộ để không làm chậm API
            new Thread(() -> emailService.sendEmail(ticket.getUserEmail(), subject, content)).start();
        }

        // 3. Gửi mail báo động cho ADMIN
        String adminSubject = "🆘 [SUPPORT TPP] Ticket Mới #" + saved.getId() + " - " + ticket.getPriority();
        String adminContent = "User: " + ticket.getUserId() + "\n" +
                "Loại: " + ticket.getCategory() + "\n" +
                "Vấn đề: " + ticket.getTitle() + "\n" +
                "Chi tiết: " + ticket.getDescription();

        new Thread(() -> emailService.sendEmail(ADMIN_EMAIL, adminSubject, adminContent)).start();

        return saved;
    }

    // --- ADMIN TRẢ LỜI ---
    public SupportTicket replyTicket(Long id, String reply, TicketStatus status) {
        SupportTicket ticket = ticketRepo.findById(id).orElseThrow();
        ticket.setAdminResponse(reply);
        ticket.setStatus(status);
        ticket.setUpdatedAt(LocalDateTime.now());
        SupportTicket saved = ticketRepo.save(ticket);

        // 4. Gửi mail thông báo cho USER
        if (ticket.getUserEmail() != null) {
            String subject = "[Chatbox AI] Admin đã phản hồi Ticket #" + id;
            String content = "Chào bạn,\n\n" +
                    "Admin vừa trả lời yêu cầu của bạn:\n" +
                    "--------------------------------\n" +
                    reply + "\n" +
                    "--------------------------------\n" +
                    "Trạng thái: " + status + "\n\n" +
                    "Vui lòng truy cập website để xem chi tiết.";

            new Thread(() -> emailService.sendEmail(ticket.getUserEmail(), subject, content)).start();
        }

        return saved;
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