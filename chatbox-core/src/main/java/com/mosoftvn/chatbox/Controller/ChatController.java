package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.Document.ChatMessage;
import com.mosoftvn.chatbox.Repository.ChatMessageRepository;
import com.mosoftvn.chatbox.Service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private GeminiService geminiService;

    // --- XỬ LÝ CHAT 1-1 VÀ BOT ---
    @MessageMapping("/chat")
    public void processMessage(@Payload ChatMessage chatMessage) {
        // 1. In Log để kiểm tra xem Frontend có gửi 2 lần không?
        System.out.println("LOG: Nhận tin nhắn từ " + chatMessage.getSenderId() + ": " + chatMessage.getContent());

        // 2. Lưu tin nhắn người dùng gửi
        ChatMessage savedMsg = chatMessageRepository.save(chatMessage);

        // 3. Gửi cho người nhận (Chỉ gửi nếu người nhận KHÔNG PHẢI là bot)
        // Vì "bot" không phải là user online, gửi cho nó là vô nghĩa
        if (!"bot".equalsIgnoreCase(chatMessage.getRecipientId())) {
            messagingTemplate.convertAndSendToUser(
                    chatMessage.getRecipientId(),
                    "/queue/messages",
                    savedMsg
            );
        }

        // 4. LOGIC XỬ LÝ AI (BOT)
        if ("bot".equalsIgnoreCase(chatMessage.getRecipientId())
                && !"bot".equalsIgnoreCase(chatMessage.getSenderId())) {

            // Chạy trong luồng riêng (tùy chọn) hoặc chạy trực tiếp
            // Để tránh block socket nếu AI trả lời chậm
            new Thread(() -> {
                String aiReply;

                // Kiểm tra có ảnh không
                if (chatMessage.getFileUrl() != null && !chatMessage.getFileUrl().isEmpty()) {
                    System.out.println("LOG: --> Bot đang phân tích ảnh...");
                    aiReply = geminiService.callGeminiWithImage(chatMessage.getContent(), chatMessage.getFileUrl());
                } else {
                    System.out.println("LOG: --> Bot đang suy nghĩ...");
                    aiReply = geminiService.callGemini(chatMessage.getContent());
                }

                // Tạo tin nhắn hồi đáp
                ChatMessage botMsg = new ChatMessage();
                botMsg.setSenderId("bot");
                botMsg.setRecipientId(chatMessage.getSenderId());
                botMsg.setContent(aiReply);
                botMsg.setTimestamp(java.time.LocalDateTime.now());

                // Lưu và Gửi trả về cho người hỏi
                chatMessageRepository.save(botMsg);
                messagingTemplate.convertAndSendToUser(
                        botMsg.getRecipientId(),
                        "/queue/messages",
                        botMsg
                );
                System.out.println("LOG: --> Bot đã trả lời xong.");
            }).start();
        }
    }

    // --- XỬ LÝ CHAT NHÓM ---
    @MessageMapping("/chat.group")
    public void sendGroupMessage(@Payload ChatMessage message) {
        // Lưu và gửi ngay
        chatMessageRepository.save(message);
        messagingTemplate.convertAndSend("/topic/group/" + message.getRecipientId(), message);
    }
}