package com.mosoftvn.chatbox.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final String MODEL_ID = "gemini-2.5-flash";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper(); // Công cụ xử lý JSON chuyên nghiệp
    private final String UPLOAD_DIR = "uploads/chat/";

    // --- HÀM 1: CHAT TEXT ---
    public String callGemini(String message) {
        return sendToGemini(createBodyTextOnly(message));
    }

    // --- HÀM 2: CHAT IMAGE + TEXT ---
    public String callGeminiWithImage(String message, String fileUrl) {
        try {
            String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            Path path = Paths.get(UPLOAD_DIR + filename);

            if (!Files.exists(path)) {
                return "Lỗi: Không tìm thấy file ảnh trên server.";
            }

            byte[] fileContent = Files.readAllBytes(path);
            String base64Data = Base64.getEncoder().encodeToString(fileContent);

            String mimeType = Files.probeContentType(path);
            if (mimeType == null) mimeType = "image/png";

            Map<String, Object> body = createBodyWithImage(message, base64Data, mimeType);
            return sendToGemini(body);

        } catch (IOException e) {
            e.printStackTrace();
            return "Lỗi đọc file ảnh: " + e.getMessage();
        }
    }

    // --- CORE: GỬI REQUEST VÀ XỬ LÝ JSON AN TOÀN ---
    private String sendToGemini(Map<String, Object> body) {
        try {
            String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_ID + ":generateContent?key=" + apiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            // 1. Nhận về chuỗi JSON thô (String) thay vì Map để tránh lỗi ép kiểu
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            // 2. Dùng Jackson để phân tích cú pháp (Parsing)
            JsonNode rootNode = objectMapper.readTree(response.getBody());

            // 3. Kiểm tra lỗi từ Google trả về
            if (rootNode.has("error")) {
                return "Lỗi từ Google: " + rootNode.path("error").path("message").asText();
            }

            // 4. Lấy nội dung tin nhắn (Duyệt cây JSON an toàn bằng .path)
            // Cấu trúc: candidates[0] -> content -> parts[0] -> text
            String textResponse = rootNode.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asText();

            return textResponse;

        } catch (Exception e) {
            e.printStackTrace();
            // Fallback nếu JSON cấu trúc lạ hoặc lỗi mạng
            return "Lỗi xử lý AI: " + e.getMessage();
        }
    }

    // --- CÁC HÀM TẠO BODY (Giữ nguyên) ---
    private Map<String, Object> createBodyTextOnly(String text) {
        Map<String, Object> part = new HashMap<>();
        part.put("text", text);
        return wrapParts(List.of(part));
    }

    private Map<String, Object> createBodyWithImage(String text, String base64Data, String mimeType) {
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", (text == null || text.trim().isEmpty()) ? "Mô tả bức ảnh này" : text);

        Map<String, Object> imagePart = new HashMap<>();
        Map<String, String> inlineData = new HashMap<>();
        inlineData.put("mime_type", mimeType);
        inlineData.put("data", base64Data);
        imagePart.put("inline_data", inlineData);

        return wrapParts(List.of(textPart, imagePart));
    }

    private Map<String, Object> wrapParts(List<Object> parts) {
        Map<String, Object> content = new HashMap<>();
        content.put("parts", parts);
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(content));
        return requestBody;
    }
}