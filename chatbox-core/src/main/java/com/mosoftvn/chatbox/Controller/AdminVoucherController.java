package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.VoucherDTO;
import com.mosoftvn.chatbox.Entity.Voucher;
import com.mosoftvn.chatbox.Service.VoucherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/market/vouchers") // Dùng chung prefix để khớp với Frontend
public class AdminVoucherController {

    @Autowired
    private VoucherService voucherService;

    // 1. ADMIN: Lấy tất cả voucher
    // Frontend gọi: /api/market/vouchers/admin/all
    @GetMapping("/admin/all")
    public ResponseEntity<List<Voucher>> getAllVouchersAdmin() {
        return ResponseEntity.ok(voucherService.getAllVouchersForAdmin());
    }

    // 2. ADMIN: Tạo voucher mới
    // Frontend gọi: /api/market/vouchers/create
    @PostMapping("/create")
    public ResponseEntity<?> createVoucher(@RequestBody VoucherDTO dto) {
        return ResponseEntity.ok(voucherService.createManualVoucher(dto));
    }

    // 3. ADMIN: Cập nhật voucher
    // Frontend gọi: /api/market/vouchers/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> updateVoucher(@PathVariable Long id, @RequestBody VoucherDTO dto) {
        return ResponseEntity.ok(voucherService.updateVoucher(id, dto));
    }

    // 4. ADMIN: Xóa voucher
    // Frontend gọi: /api/market/vouchers/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVoucher(@PathVariable Long id) {
        voucherService.deleteVoucher(id);
        return ResponseEntity.ok("Deleted");
    }

    // 5. ADMIN: Sync (Quét bù)
    // Frontend gọi: /api/market/vouchers/admin/sync-missing (Đã sửa frontend khớp cái này)
    // Hoặc nếu frontend gọi /api/vouchers/admin/sync-missing thì map thêm cái đó.
    // Ở đây ta map theo chuẩn /api/market/vouchers
    @PostMapping("/admin/sync-missing")
    public ResponseEntity<String> syncMissingVouchers() {
        return ResponseEntity.ok(voucherService.syncVouchersForExistingUsers());
    }
}