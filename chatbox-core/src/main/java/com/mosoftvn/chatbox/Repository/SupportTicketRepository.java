package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.SupportTicket;
import com.mosoftvn.chatbox.Entity.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    // Lấy ticket của một user cụ thể (Lịch sử hỗ trợ)
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(String userId);

    // Lấy ticket theo trạng thái (Cho Admin lọc)
    List<SupportTicket> findByStatus(TicketStatus status);
}