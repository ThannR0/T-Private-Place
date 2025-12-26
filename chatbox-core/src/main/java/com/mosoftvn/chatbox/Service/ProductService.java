package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.ProductDTO;
import com.mosoftvn.chatbox.Entity.Product;
import com.mosoftvn.chatbox.Entity.ProductStatus;
import com.mosoftvn.chatbox.Entity.Shop;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.ProductRepository;
import com.mosoftvn.chatbox.Repository.ShopRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProductService {
    @Autowired
    private ProductRepository productRepository;
    @Autowired private UserRepository userRepository;

    @Autowired private ShopRepository shopRepository;

    @Autowired private CloudinaryService cloudinaryService;
    // 1. Đăng bán
    @Transactional
    public Product createProduct(ProductDTO req, String username) throws IOException {
        User seller = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shop shop = shopRepository.findByOwner(seller)
                .orElseThrow(() -> new RuntimeException("Bạn chưa tạo Shop! Vui lòng đăng ký Shop trước."));

        Product p = new Product();
        p.setName(req.getName());
        p.setDescription(req.getDescription());
        p.setPrice(req.getPrice());
        p.setShippingFee(req.getShippingFee() != null ? req.getShippingFee() : 0.0);
        p.setQuantity(req.getQuantity());
        p.setCategory(req.getCategory());
        p.setSeller(seller);
        p.setShop(shop);
        p.setStatus(ProductStatus.PENDING); // Enum
        p.setCreatedAt(java.time.LocalDateTime.now());

        List<String> imageUrls = new ArrayList<>();

        // 🟢 SỬA LẠI: Gọi đúng getImages()
        if (req.getImages() != null && !req.getImages().isEmpty()) {
            for (MultipartFile file : req.getImages()) {
                if (!file.isEmpty()) {
                    String url = cloudinaryService.uploadFile(file);
                    imageUrls.add(url);
                }
            }
        }
        p.setImages(imageUrls); // Lưu List<String> URL vào entity

        return productRepository.save(p);
    }

    // 2. Sửa sản phẩm (CẤM SỬA GIÁ)
    // Nhớ thêm 'throws IOException' vào sau tên hàm để xử lý lỗi lưu file
    public Product updateProduct(Long id, ProductDTO req, String username) throws IOException {
        Product p = productRepository.findById(id).orElseThrow();
        if (!p.getSeller().getUsername().equals(username)) throw new RuntimeException("Không có quyền!");

        p.setName(req.getName());
        p.setDescription(req.getDescription());
        p.setQuantity(req.getQuantity());
        p.setCategory(req.getCategory());

        // 🟢 LOGIC MỚI: CỘNG DỒN ẢNH CLOUD
        if (req.getImages() != null && !req.getImages().isEmpty()) {
            List<String> newUrls = new ArrayList<>();
            for (MultipartFile file : req.getImages()) {
                if (!file.isEmpty()) {
                    String url = cloudinaryService.uploadFile(file);
                    newUrls.add(url);
                }
            }
            if (p.getImages() == null) p.setImages(newUrls);
            else p.getImages().addAll(newUrls);
        }

        return productRepository.save(p);
    }

    public List<Product> getAllPending() {
        return productRepository.findByStatus(ProductStatus.PENDING);
    }

    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại hoặc đã bị xóa"));
    }

    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + id));

        // (Xóa mềm - An toàn tuyệt đối):
        // Đổi trạng thái sang DELETED để ẩn khỏi chợ nhưng vẫn giữ được lịch sử đơn hàng
        product.setStatus(ProductStatus.HIDDEN);

        productRepository.save(product);
    }

    // 3. Admin duyệt/từ chối
    public void approveProduct(Long id, boolean isApproved) {
        Product p = productRepository.findById(id).orElseThrow();
        p.setStatus(isApproved ? ProductStatus.APPROVED : ProductStatus.REJECTED);
        productRepository.save(p);
    }

    // 4. Lấy danh sách (Cho trang chủ)
    public List<Product> getAllApproved() {
        return productRepository.findByStatus(ProductStatus.APPROVED);
    }

    public List<Product> getAllProductsAdmin() {
        return productRepository.findAll();
    }

}
