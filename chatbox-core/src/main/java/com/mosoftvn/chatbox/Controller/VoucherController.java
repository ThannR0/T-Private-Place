package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.Entity.Voucher;
import com.mosoftvn.chatbox.Service.VoucherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
// 🟢 QUAN TRỌNG: Phải có /api ở đầu để khớp với AdminController
@RequestMapping("/api/market/vouchers")
public class VoucherController {

    @Autowired
    private VoucherService voucherService;

    // 1. USER: Lấy voucher của tôi
    @GetMapping("/my-vouchers")
    public ResponseEntity<List<Voucher>> getMyVouchers(Authentication authentication) {
        return ResponseEntity.ok(voucherService.getMyVouchers(authentication.getName()));
    }

    // 2. USER: Ẩn voucher (Xóa mềm)
    @PutMapping("/{id}/hide")
    public ResponseEntity<?> hideVoucher(@PathVariable Long id, Authentication auth) {
        voucherService.hideVoucher(id, auth.getName());
        return ResponseEntity.ok("Hidden");
    }

    // 3. PUBLIC: Check voucher
    @GetMapping("/check")
    public ResponseEntity<?> checkVoucher(@RequestParam String code) {
        try {
            // Gọi Service để lấy thông tin chi tiết voucher (percent, amount...)
            Voucher v = voucherService.getValidVoucher(code);
            return ResponseEntity.ok(v);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}