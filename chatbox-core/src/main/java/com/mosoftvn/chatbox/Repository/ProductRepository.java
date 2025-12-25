package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Product;
import com.mosoftvn.chatbox.Entity.ProductStatus;
import com.mosoftvn.chatbox.Entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStatus(ProductStatus status); // Lấy sp đã duyệt
    List<Product> findBySellerUsername(String username); // Lấy sp của người bán
    List<Product> findByShopAndStatus(Shop shop, ProductStatus status);
    // 🟢 TÍNH TỔNG SỐ LƯỢNG ĐÃ BÁN CỦA CẢ SHOP
    @Query("SELECT COALESCE(SUM(p.sold), 0) FROM Product p WHERE p.shop.id = :shopId")
    Integer sumSoldByShop(@Param("shopId") Long shopId);

    // 🟢 TÍNH SAO TRUNG BÌNH CỦA SHOP (Dựa trên trung bình sao các sản phẩm)
    @Query("SELECT AVG(p.rating) FROM Product p WHERE p.shop.id = :shopId")
    Double getAverageRatingByShop(@Param("shopId") Long shopId);


}
