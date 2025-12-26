package com.mosoftvn.chatbox.Controller;


import com.mosoftvn.chatbox.DTO.OrderDTO;
import com.mosoftvn.chatbox.DTO.ProductDTO;
import com.mosoftvn.chatbox.DTO.ReviewDTO;
import com.mosoftvn.chatbox.DTO.ShopDTO;
import com.mosoftvn.chatbox.Entity.OrderStatus;
import com.mosoftvn.chatbox.Entity.Review;
import com.mosoftvn.chatbox.Entity.Shop;
import com.mosoftvn.chatbox.Repository.ProductRepository;
import com.mosoftvn.chatbox.Service.ProductService;
import com.mosoftvn.chatbox.Service.ShopOrderService;
import com.mosoftvn.chatbox.Service.ShopService;
import io.jsonwebtoken.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/market")
public class MarketController {
    @Autowired
    private ProductService productService;
    @Autowired private ShopOrderService orderService;
    @Autowired
    private ProductRepository productRepository;
    @Autowired private ShopService shopService;

    @Autowired private com.mosoftvn.chatbox.Repository.VoucherRepository voucherRepository;

    // --- PRODUCT ---
    @PostMapping(value = "/products/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createProduct(@ModelAttribute ProductDTO dto, Principal principal) {
        try {
            // Gọi đúng hàm Service bạn vừa gửi cho tôi
            return ResponseEntity.ok(productService.createProduct(dto, principal.getName()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<?> getProductDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(productService.getProductById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping(value = "/products/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @ModelAttribute ProductDTO dto, Principal principal) {
        try {
            return ResponseEntity.ok(productService.updateProduct(id, dto, principal.getName()));
        } catch (IOException | java.io.IOException e) {
            return ResponseEntity.badRequest().body("Lỗi lưu ảnh: " + e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/products")
    public ResponseEntity<?> getAllProducts() {
        return ResponseEntity.ok(productService.getAllApproved());
    }

    // --- ORDER ---
    @PostMapping("/orders/create")
    public ResponseEntity<?> createOrder(@RequestBody OrderDTO dto, Principal principal) {
        try {
            return ResponseEntity.ok(orderService.createOrder(dto, principal.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam OrderStatus status, Principal principal) {
        try {
            orderService.updateStatus(id, status, principal.getName());
            return ResponseEntity.ok("Cập nhật trạng thái thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-products")
    public ResponseEntity<?> getMyProducts(Principal principal) {
        // Cần thêm hàm findBySellerUsername trong ProductRepository hoặc Service
        // Ở đây gọi thông qua Repository cho nhanh, hoặc bạn bọc qua Service nhé
        return ResponseEntity.ok(productRepository.findBySellerUsername(principal.getName()));
    }

    // 2. Lấy danh sách đơn hàng người khác mua của TÔI
    @GetMapping("/my-sales")
    public ResponseEntity<?> getMySales(Principal principal) {
        // Hàm này đã có sẵn trong Repository
        return ResponseEntity.ok(orderService.getOrdersBySeller(principal.getName()));
    }



    @GetMapping("/orders/my-orders")
    public ResponseEntity<?> getMyOrders(Principal principal) {
        return ResponseEntity.ok(orderService.getMyOrders(principal.getName()));
    }


    // --- REVIEW ENDPOINTS ---

    @GetMapping("/reviews/{productId}")
    public ResponseEntity<List<Review>> getProductReviews(@PathVariable Long productId) {
        return ResponseEntity.ok(shopService.getReviewsByProduct(productId));
    }

    @PostMapping("/reviews")
    public ResponseEntity<?> createReview(@RequestBody ReviewDTO dto, Authentication authentication) {
        try {
            Review review = shopService.createReview(authentication.getName(), dto);
            return ResponseEntity.ok(review);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}