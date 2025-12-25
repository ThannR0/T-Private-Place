package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.ShopDTO;
import com.mosoftvn.chatbox.Entity.Product;
import com.mosoftvn.chatbox.Entity.Shop;
import com.mosoftvn.chatbox.Service.ShopService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/market/shop")
public class ShopController {

    @Autowired
    private ShopService shopService;

    // 🟢 1. ĐĂNG KÝ SHOP (Có upload Logo)
    // Dùng @ModelAttribute để nhận form-data (gồm text + file)
    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> registerShop(
            @ModelAttribute ShopDTO dto,
            Authentication authentication
    ) {
        try {
            Shop shop = shopService.registerShop(authentication.getName(), dto);
            return ResponseEntity.ok(shop);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 🟢 2. LẤY SHOP CỦA TÔI (Cho trang quản lý)
    @GetMapping("/me")
    public ResponseEntity<?> getMyShop(Authentication authentication) {
        Shop shop = shopService.getShopByUsername(authentication.getName());
        return ResponseEntity.ok(shop);
    }

    // 🟢 3. CẬP NHẬT SHOP (Cho chủ shop sửa thông tin)
    @PutMapping("/update")
    public ResponseEntity<?> updateShop(@RequestBody ShopDTO dto, Authentication authentication) {
        try {
            Shop shop = shopService.updateShopInfo(authentication.getName(), dto);
            return ResponseEntity.ok(shop);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 🟢 4. XEM SHOP NGƯỜI KHÁC (Public Profile)
    @GetMapping("/profile/{username}")
    public ResponseEntity<?> getShopProfile(@PathVariable String username) {
        try {
            Shop shop = shopService.getPublicShopProfile(username);
            return ResponseEntity.ok(shop);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Shop không tồn tại");
        }
    }

    // 🟢 5. LẤY SẢN PHẨM CỦA SHOP ĐÓ
    @GetMapping("/{username}/products")
    public ResponseEntity<?> getShopProducts(@PathVariable String username) {
        try {
            List<Product> products = shopService.getShopProducts(username);
            return ResponseEntity.ok(products);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of()); // Trả về list rỗng nếu lỗi
        }
    }
}