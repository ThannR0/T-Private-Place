package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.ReviewDTO;
import com.mosoftvn.chatbox.DTO.ShopDTO;
import com.mosoftvn.chatbox.Entity.*;
import com.mosoftvn.chatbox.Repository.ProductRepository;
import com.mosoftvn.chatbox.Repository.ReviewRepository;
import com.mosoftvn.chatbox.Repository.ShopRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import io.jsonwebtoken.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ShopService {
    @Autowired private ShopRepository shopRepository;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CloudinaryService cloudinaryService;

    // --- SHOP LOGIC ---

    public Shop getShopByUsername(String username) {
        return shopRepository.findByOwner_Username(username).orElse(null);
    }


    @Transactional
    public Shop registerShop(String username, ShopDTO dto) throws IOException { // Thêm throws IOException
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (shopRepository.existsByOwner(user)) {
            throw new RuntimeException("Bạn đã có Shop rồi!");
        }

        Shop shop = new Shop();
        shop.setShopName(dto.getShopName());
        shop.setAddress(dto.getAddress());
        shop.setPhoneNumber(dto.getPhoneNumber());
        shop.setDescription(dto.getDescription());
        shop.setOwner(user);

        // 🟢 XỬ LÝ LOGO SHOP
        if (dto.getAvatar() != null && !dto.getAvatar().isEmpty()) {
            // Nếu người dùng có up ảnh logo -> Upload lên Cloudinary -> Lấy URL
            String logoUrl = cloudinaryService.uploadFile(dto.getAvatar());
            shop.setAvatarUrl(logoUrl);
        } else {
            // Nếu không up -> Lấy tạm avatar của User làm logo
            shop.setAvatarUrl(user.getAvatar()); // Hoặc để null
        }

        shop.setTotalSold(0);
        shop.setRating(5.0);

        return shopRepository.save(shop);
    }

    public Shop updateShopInfo(String username, ShopDTO dto) {
        Shop shop = getShopByUsername(username);
        if(shop == null) throw new RuntimeException("Shop không tồn tại");

        if(dto.getShopName() != null) shop.setShopName(dto.getShopName());
        if(dto.getPhoneNumber() != null) shop.setPhoneNumber(dto.getPhoneNumber());
        if(dto.getAddress() != null) shop.setAddress(dto.getAddress());
        if(dto.getDescription() != null) shop.setDescription(dto.getDescription());

        return shopRepository.save(shop);
    }

    // --- REVIEW LOGIC ---

    public List<Review> getReviewsByProduct(Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }

    @Transactional
    public Review createReview(String username, ReviewDTO dto) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Review review = new Review();
        review.setUser(user);
        review.setProduct(product);
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
        review.setCreatedAt(LocalDateTime.now());

        return reviewRepository.save(review);
    }

    // 🟢 1. Lấy thông tin Shop công khai (Public Profile)
    public Shop getPublicShopProfile(String username) {
        return shopRepository.findByOwner_Username(username)
                .orElseThrow(() -> new RuntimeException("Shop không tồn tại hoặc người dùng chưa tạo Shop"));
    }

    // 🟢 2. Lấy danh sách sản phẩm của Shop đó
    public List<Product> getShopProducts(String username) {
        // Tìm Shop trước
        Shop shop = getPublicShopProfile(username);

        // Lấy list sản phẩm đã duyệt của shop này
        return productRepository.findByShopAndStatus(shop, ProductStatus.APPROVED);
    }
}