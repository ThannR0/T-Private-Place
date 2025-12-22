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
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final String MODEL_ID = "gemini-2.5-flash";
//    private final String MODEL_ID = "gemini-1.5-flash";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String UPLOAD_DIR = "uploads/chat/";

    // --- HÀM 1: CHAT TEXT ---
    public String callGemini(String message) {
        return sendToGemini(createBodyTextOnly(message));
    }

    // --- HÀM 2: CHAT ĐA PHƯƠNG TIỆN (ẢNH, VIDEO, PDF) ---
    public String callGeminiWithImage(String message, String fileUrl) {
        try {
            byte[] fileContent;
            String mimeType;

            // A. TẢI FILE (Cloud vs Local)
            if (fileUrl.startsWith("http") || fileUrl.startsWith("https")) {
                System.out.println("LOG: Bot đang tải file từ Cloud: " + fileUrl);
                try (InputStream in = new URL(fileUrl).openStream()) {
                    fileContent = in.readAllBytes();
                }
                // Xác định MimeType từ đuôi file URL
                mimeType = getMimeTypeFromUrl(fileUrl);
            } else {
                // Fallback Local
                Path path = Paths.get(UPLOAD_DIR + fileUrl.substring(fileUrl.lastIndexOf("/") + 1));
                if (!Files.exists(path)) return "Lỗi: Không tìm thấy file trên server.";
                fileContent = Files.readAllBytes(path);
                mimeType = Files.probeContentType(path);
            }

            if (mimeType == null) mimeType = "application/octet-stream";
            System.out.println("LOG: Phát hiện định dạng: " + mimeType);

            // B. KIỂM TRA HỖ TRỢ CỦA GEMINI
            // Gemini Inline chỉ hỗ trợ: Image, PDF, Video, Audio, Text.
            // Excel/Word (.xlsx, .docx) sẽ KHÔNG chạy được qua đường này.
            if (isSupportedByGemini(mimeType)) {
                String base64Data = Base64.getEncoder().encodeToString(fileContent);
                Map<String, Object> body = createBodyWithFile(message, base64Data, mimeType);
                return sendToGemini(body);
            } else {
                return "Hiện tại tôi chỉ đọc được Ảnh, Video, PDF và File Text. " +
                        "Với Excel/Word, vui lòng chuyển sang PDF hoặc chụp ảnh màn hình giúp tôi nhé!";
            }

        } catch (IOException e) {
            e.printStackTrace();
            return "Lỗi đọc file: " + e.getMessage();
        }
    }


    // 1. Xác định loại file dựa vào đuôi link Cloudinary
    private String getMimeTypeFromUrl(String url) {
        String lowerUrl = url.toLowerCase();
        if (lowerUrl.endsWith(".png")) return "image/png";
        if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) return "image/jpeg";
        if (lowerUrl.endsWith(".webp")) return "image/webp";
        if (lowerUrl.endsWith(".pdf")) return "application/pdf"; // PDF
        if (lowerUrl.endsWith(".mp4")) return "video/mp4";       // Video
        if (lowerUrl.endsWith(".mp3")) return "audio/mp3";       // Audio
        if (lowerUrl.endsWith(".txt")) return "text/plain";
        if (lowerUrl.endsWith(".csv")) return "text/csv";
        return "application/octet-stream"; // Không rõ
    }

    // 2. Kiểm tra Gemini có hỗ trợ native không
    private boolean isSupportedByGemini(String mimeType) {
        return mimeType.startsWith("image/") ||
                mimeType.startsWith("video/") ||
                mimeType.startsWith("audio/") ||
                mimeType.equals("application/pdf") ||
                mimeType.startsWith("text/");
    }

    // --- CORE: GỬI REQUEST (Giữ nguyên) ---
    private String sendToGemini(Map<String, Object> body) {
        int maxRetries = 3; // Thử tối đa 3 lần
        int waitTime = 2000; // Chờ 2 giây mỗi lần

        for (int i = 0; i < maxRetries; i++) {
            try {
                String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_ID + ":generateContent?key=" + apiKey;
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

                ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);
                JsonNode rootNode = objectMapper.readTree(response.getBody());

                if (rootNode.has("error")) {
                    return "Lỗi từ Google: " + rootNode.path("error").path("message").asText();
                }

                return rootNode.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

            } catch (Exception e) {
                // Nếu là lỗi 503 (Quá tải) và chưa hết số lần thử -> Chờ rồi thử lại
                if (e.getMessage().contains("503") || e.getMessage().contains("429")) {
                    if (i < maxRetries - 1) {
                        System.out.println("Google AI quá tải, đang thử lại lần " + (i + 2) + "...");
                        try { Thread.sleep(waitTime); } catch (InterruptedException ignored) {}
                        continue; // Quay lại vòng lặp
                    }
                }
                e.printStackTrace();
                return "AI đang quá tải, vui lòng thử lại sau vài phút!";
            }
        }
        return "Lỗi kết nối AI.";
    }

    // --- TẠO BODY JSON ---
    private Map<String, Object> createBodyTextOnly(String text) {
        Map<String, Object> part = new HashMap<>();
        part.put("text", text);
        return wrapParts(List.of(part));
    }

    private Map<String, Object> createBodyWithFile(String text, String base64Data, String mimeType) {
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", (text == null || text.trim().isEmpty()) ? "Hãy phân tích nội dung file này" : text);

        Map<String, Object> filePart = new HashMap<>();
        Map<String, String> inlineData = new HashMap<>();
        inlineData.put("mime_type", mimeType);
        inlineData.put("data", base64Data);
        filePart.put("inline_data", inlineData);

        return wrapParts(List.of(textPart, filePart));
    }

    private Map<String, Object> wrapParts(List<Object> parts) {
        Map<String, Object> content = new HashMap<>();
        content.put("parts", parts);
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(content));
        return requestBody;
    }
}