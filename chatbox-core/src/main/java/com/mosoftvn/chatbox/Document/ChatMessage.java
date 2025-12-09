package com.mosoftvn.chatbox.Document;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

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