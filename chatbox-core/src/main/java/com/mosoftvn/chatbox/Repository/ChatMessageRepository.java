package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Document.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    // Tìm tin nhắn giữa 2 người (A gửi B hoặc B gửi A)

    List<ChatMessage> findBySenderIdAndRecipientId(String senderId, String recipientId);
    List<ChatMessage> findBySenderIdOrRecipientId(String senderId, String recipientId);
    List<ChatMessage> findByRecipientIdIn(List<String> recipientIds);
    List<ChatMessage> findBySenderIdOrRecipientIdOrderByTimestampAsc(String senderId, String recipientId);
}