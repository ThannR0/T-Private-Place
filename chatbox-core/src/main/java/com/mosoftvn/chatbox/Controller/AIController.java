package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.Service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*") // Quan trọng: Cho phép Frontend gọi vào
public class AIController {

    @Autowired
    private GeminiService geminiService;

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody Map<String, String> body) {
        String prompt = body.get("prompt");
        String tone = body.get("tone");

        // 1. Xây dựng câu lệnh hoàn chỉnh cho AI
        String finalPrompt = buildPrompt(prompt, tone);

        String result = geminiService.callGemini(finalPrompt);

        // 3. Trả về đúng định dạng Frontend cần: { "content": "..." }
        return ResponseEntity.ok(Map.of("content", result));
    }

    // Hàm phụ trợ để ghép prompt cho hay
    // Hàm phụ trợ để ghép prompt chặt chẽ hơn
    private String buildPrompt(String userPrompt, String tone) {
        String styleInstruction = "";
        switch (tone) {
            case "funny": styleInstruction = "hài hước, vui nhộn, bắt trend, dùng nhiều icon sinh động. Không cần chào hỏi hay mở đầu vào vấn đề chính luôn "; break;
            case "serious": styleInstruction = "nghiêm túc, sâu sắc, có tính triết lý, giọng văn trầm ổn. Không cần chào hỏi hay mở đầu vào vấn đề chính luôn"; break;
            case "professional": styleInstruction = "chuyên nghiệp, lịch sự, dùng từ ngữ công sở/doanh nhân. Không cần chào hỏi hay mở đầu vào vấn đề chính luôn"; break;
            default: styleInstruction = "tự nhiên, thân thiện như một người bạn.";
        }

        if ("custom".equals(tone)) {
            // Với custom, vẫn cần ép AI không nói nhảm
            return String.format(
                    "Yêu cầu: %s. " +
                            "QUAN TRỌNG: Chỉ trả về duy nhất nội dung bài viết. Không bao gồm lời chào, không bao gồm câu dẫn nhập như 'Dưới đây là...', không để trong ngoặc kép.",
                    userPrompt
            );
        }

        // Prompt template chuẩn
        return String.format(
                "Hãy viết một status mạng xã hội bằng tiếng Việt. " +
                        "Chủ đề/Nội dung: %s. " +
                        "Phong cách: %s. " +
                        "QUAN TRỌNG: Chỉ trả về duy nhất nội dung bài viết. Tuyệt đối không có lời chào đầu (như 'Dạ vâng', 'Chắc chắn rồi') và không có lời kết. Chỉ đưa ra nội dung cần đăng.",
                userPrompt, styleInstruction
        );
    }
}