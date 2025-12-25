package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.Entity.Voucher;
import com.mosoftvn.chatbox.Repository.UserRepository;
import com.mosoftvn.chatbox.Service.UserService;
import com.mosoftvn.chatbox.Service.VoucherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
public class VoucherController {

    @Autowired
    private VoucherService voucherService;

    @Autowired private UserRepository userRepository;

    // API lấy danh sách voucher của tôi
    @GetMapping("/my-vouchers")
    public ResponseEntity<List<Voucher>> getMyVouchers(Authentication authentication) {
        // Lấy username người đang đăng nhập
        String username = authentication.getName();

        // Gọi Service lấy danh sách
        List<Voucher> vouchers = voucherService.getMyVouchers(username);

        return ResponseEntity.ok(vouchers);
    }

    @GetMapping("/admin/all")
    public ResponseEntity<List<Voucher>> getAllVouchersAdmin() {
        return ResponseEntity.ok(voucherService.getAllVouchersForAdmin());
    }






}