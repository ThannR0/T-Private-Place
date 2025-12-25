package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);
    // 🟢 TÍNH SAO TRUNG BÌNH CỦA 1 SẢN PHẨM
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId")
    Double getAverageRatingByProduct(@Param("productId") Long productId);
}