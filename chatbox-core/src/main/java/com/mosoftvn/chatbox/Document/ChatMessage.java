package com.mosoftvn.chatbox.Document;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Setter
@Getter
@Document(collection = "chat_messages")
public class ChatMessage {

    // Getter & Setter thủ công
    @Id
    private String id; // MongoDB dùng ID dạng String

    private String senderId; // Username người gửi
    private String recipientId; // Username người nhận
    private String content; // Nội dung tin nhắn
    private LocalDateTime timestamp; // Thời gian gửi

    private String fileUrl;  // Đường dẫn file/ảnh
    private String fileType; // Loại file (image/png, application/pdf...)
    private String fileName;

    private String type;

    // Trong Entity ChatMessage
    private boolean isEdited = false;
    private boolean isRevoked = false; // Thu hồi
    private boolean isPinned = false;  // Ghim

    private Map<String, String> reactions = new HashMap<>();
    // Constructor
    public ChatMessage() {
    }

    public ChatMessage(String senderId, String recipientId, String content) {
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.content = content;
        this.timestamp = LocalDateTime.now();
    }

}