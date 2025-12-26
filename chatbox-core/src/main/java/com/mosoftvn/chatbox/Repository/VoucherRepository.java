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
    Optional<Voucher> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByCodeStartingWith(String prefix);

    // Lấy tất cả (kể cả đã dùng/hết hạn) ĐỂ HIỂN THỊ LỊCH SỬ
    // Chỉ lọc bỏ những cái user đã chủ động xóa (deletedByUser = true)
    @Query("SELECT v FROM Voucher v WHERE (v.owner.id = :userId OR v.owner IS NULL) AND (v.deletedByUser = false OR v.deletedByUser IS NULL) ORDER BY v.id DESC")
    List<Voucher> findAllVouchersForUser(@Param("userId") Long userId);


}