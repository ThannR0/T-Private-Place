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
    List<ChatMessage> findByRecipientIdAndIsPinnedTrue(String recipientId);

    // 2. Tìm tin nhắn đang ghim trong Chat 1-1 (Cần check cả 2 chiều A->B và B->A)
    List<ChatMessage> findBySenderIdAndRecipientIdAndIsPinnedTrue(String senderId, String recipientId);
}