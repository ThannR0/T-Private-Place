package com.mosoftvn.chatbox.Service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class CloudinaryService {

    @Autowired
    private Cloudinary cloudinary;

    public String uploadFile(MultipartFile file) {
        try {
            String contentType = file.getContentType();
            String resourceType = "auto"; // Mặc định để tự động (cho ảnh/video)

            // --- LOGIC MỚI: TỰ ĐỘNG PHÁT HIỆN TÀI LIỆU ---
            // Nếu là PDF, Excel, Word, Text -> Chuyển sang chế độ "raw" (File thô)
            // Chế độ "raw" không bị lỗi 401 và giữ nguyên định dạng file
            if (contentType != null && (
                    contentType.contains("pdf") ||
                            contentType.contains("document") ||
                            contentType.contains("sheet") ||
                            contentType.contains("msword") ||
                            contentType.contains("text/plain")
            )) {
                resourceType = "raw";
            }

            Map<String, Object> params = new HashMap<>();
            params.put("resource_type", resourceType);

            // QUAN TRỌNG: Với file RAW, phải tự đặt tên file có đuôi (ví dụ .pdf)
            // Nếu không Cloudinary sẽ đặt tên ngẫu nhiên không có đuôi -> Bot không biết file gì
            if ("raw".equals(resourceType)) {
                String originalFileName = file.getOriginalFilename();
                // Thêm timestamp để tránh trùng tên
                String uniqueFileName = System.currentTimeMillis() + "_" + originalFileName;

                params.put("public_id", uniqueFileName);
                params.put("use_filename", true);
                params.put("unique_filename", false); // Ta đã tự handle unique rồi
            }

            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
            return uploadResult.get("secure_url").toString();

        } catch (IOException e) {
            throw new RuntimeException("Lỗi upload Cloudinary: " + e.getMessage());
        }
    }
}