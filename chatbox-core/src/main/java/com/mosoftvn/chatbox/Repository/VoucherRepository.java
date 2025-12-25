package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    Optional<Voucher> findByCodeAndOwnerUsername(String code, String username);

    // 1. Kiểm tra mã chính xác
    boolean existsByCode(String code);

    // 2. Kiểm tra mã bắt đầu bằng... (Dùng cho logic Sync)
    // Ví dụ: Kiểm tra xem user này đã có voucher VIP_GOLD... chưa
    boolean existsByCodeStartingWith(String prefix);

    // 3. Lấy voucher của User (Riêng hoặc Chung)
    @Query("SELECT v FROM Voucher v WHERE (v.owner.id = :userId OR v.owner IS NULL) " +
            "AND v.expiryDate > :now " +
            "AND v.isActive = true " +
            "AND v.usedCount < v.usageLimit")
    List<Voucher> findAvailableVouchersForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);
    List<Voucher> findByOwnerUsernameAndDeletedByUserFalse(String username);


}