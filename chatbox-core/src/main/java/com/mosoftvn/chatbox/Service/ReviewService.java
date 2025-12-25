package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.ReviewDTO;
import com.mosoftvn.chatbox.Entity.*;
import com.mosoftvn.chatbox.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ReviewService {

    @Autowired private ReviewRepository reviewRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ShopRepository shopRepository;

    @Transactional
    public Review createReview(ReviewDTO dto, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Tạo review mới
        Review review = new Review();
        review.setUser(user);
        review.setProduct(product);
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
        review.setCreatedAt(LocalDateTime.now());

        reviewRepository.save(review);

        // 🟢 1. TÍNH LẠI SAO CHO SẢN PHẨM NÀY
        Double avgProductRating = reviewRepository.getAverageRatingByProduct(product.getId());
        // Làm tròn 1 chữ số thập phân (VD: 4.5)
        double roundedProductRating = Math.round(avgProductRating * 10.0) / 10.0;
        product.setRating(roundedProductRating);
        productRepository.save(product);

        // 🟢 2. TÍNH LẠI SAO CHO SHOP (Trung bình của tất cả sản phẩm trong shop)
        Shop shop = product.getShop();
        Double avgShopRating = productRepository.getAverageRatingByShop(shop.getId());
        if (avgShopRating != null) {
            double roundedShopRating = Math.round(avgShopRating * 10.0) / 10.0;
            shop.setRating(roundedShopRating);
            shopRepository.save(shop);
        }

        return review;
    }
}