package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // Lấy lịch sử của user, sắp xếp mới nhất
    List<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Tìm theo mã code (để duyệt)
    Optional<Transaction> findByTransactionCode(String code);

    // Thống kê số tiền nạp theo tháng (Dùng Native Query hoặc JPQL)
    // Sửa date_format -> to_char
    @Query(value = "SELECT to_char(t.created_at, 'YYYY-MM') as month, SUM(t.amount_vnd) as total " +
            "FROM transactions t " +
            "WHERE t.user_id = :userId AND t.status = 'SUCCESS' " +
            "GROUP BY to_char(t.created_at, 'YYYY-MM') " +
            "ORDER BY month ASC", nativeQuery = true)
    List<Object[]> getMonthlyStats(@Param("userId") Long userId);

    //Chỉ tính amountVnd > 0 và status SUCCESS
    @Query("SELECT COALESCE(SUM(t.amountVnd), 0) FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.status = 'SUCCESS' " +
            "AND (t.type = 'DEPOSIT' OR t.type = 'ADMIN_ADD' OR t.type = 'DONATE')")
    Double sumTotalIncomingMoney(@Param("userId") Long userId);
}