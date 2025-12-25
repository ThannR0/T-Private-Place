package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Transaction;
import com.mosoftvn.chatbox.Entity.TransactionStatus;
import com.mosoftvn.chatbox.Entity.TransactionType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Transaction> findByTransactionCode(String code);

    @Query(value = "SELECT to_char(t.created_at, 'YYYY-MM') as month, SUM(t.amount_vnd) as total " +
            "FROM transactions t " +
            "WHERE t.user_id = :userId AND t.status = 'SUCCESS' " +
            "GROUP BY to_char(t.created_at, 'YYYY-MM') " +
            "ORDER BY month ASC", nativeQuery = true)
    List<Object[]> getMonthlyStats(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(t.amountVnd), 0) FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.status = 'SUCCESS' " +
            "AND (t.type = 'DEPOSIT' OR t.type = 'ADMIN_ADD' OR t.type = 'DONATE')")
    Double sumTotalIncomingMoney(@Param("userId") Long userId);

    // --- PHẦN ADMIN DASHBOARD ---

    // 1. Tính tổng tiền nạp thành công (Giữ nguyên Query này vì nó đơn giản và hiệu quả)
    @Query("SELECT COALESCE(SUM(t.amountVnd), 0) FROM Transaction t WHERE t.status = 'SUCCESS' AND t.type = 'DEPOSIT'")
    Double sumSystemTotalDeposit();

    // 2. Top Đại gia (Giữ nguyên)
    @Query("SELECT t.user, SUM(t.amountVnd) FROM Transaction t " +
            "WHERE t.status = 'SUCCESS' AND t.type = 'DEPOSIT' " +
            "GROUP BY t.user " +
            "ORDER BY SUM(t.amountVnd) DESC")
    List<Object[]> findTopDepositors(Pageable pageable);

    // 3. Thống kê theo Phương thức (Giữ nguyên)
    @Query("SELECT t.paymentMethod, COUNT(t) FROM Transaction t " +
            "WHERE t.status = 'SUCCESS' AND t.type = 'DEPOSIT' " +
            "GROUP BY t.paymentMethod")
    List<Object[]> countByPaymentMethod();



    // 4. Lấy tất cả giao dịch nạp thành công (Để vẽ biểu đồ Tháng)
    // Spring Data tự generate SQL dựa trên tên hàm
    List<Transaction> findByStatusAndTypeOrderByCreatedAtAsc(TransactionStatus status, TransactionType type);

    // 5. Lấy giao dịch theo khoảng thời gian (Để vẽ biểu đồ 7 ngày & Trạng thái)
    List<Transaction> findByCreatedAtAfter(LocalDateTime date);

    @Query("SELECT t FROM Transaction t " +
            "WHERE t.status = 'SUCCESS' AND t.type = 'DEPOSIT' " +
            "AND t.createdAt >= :startDate " +
            "ORDER BY t.createdAt ASC")
    List<Transaction> findRecentDeposits(@Param("startDate") LocalDateTime startDate);

    // Lấy danh sách giao dịch trong khoảng thời gian (để xuất Excel/PDF)
    List<Transaction> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate);
}