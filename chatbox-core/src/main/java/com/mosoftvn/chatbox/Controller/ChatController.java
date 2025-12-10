package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.GroupDetailDTO;
import com.mosoftvn.chatbox.Document.ChatMessage;
import com.mosoftvn.chatbox.Entity.ChatGroup;
import com.mosoftvn.chatbox.Repository.ChatGroupRepository;
import com.mosoftvn.chatbox.Repository.ChatMessageRepository;
import com.mosoftvn.chatbox.Service.CloudinaryService;
import com.mosoftvn.chatbox.Service.GeminiService;
import com.mosoftvn.chatbox.Service.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;


@Controller
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired private GroupService groupService;
    @Autowired private ChatGroupRepository chatGroupRepository;

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

    // 1. API Upload ảnh Chat (Đã dùng Cloudinary)
    @PostMapping("/upload")
    @ResponseBody // Bắt buộc có để trả về JSON
    public ResponseEntity<?> uploadChatImage(@RequestParam("file") MultipartFile file) {
        try {
            // Gọi Cloudinary Service để lấy link ảnh
            String url = cloudinaryService.uploadFile(file);

            // Trả về đúng định dạng mà Frontend cần
            return ResponseEntity.ok(Map.of(
                    "url", url,
                    "name", Objects.requireNonNull(file.getOriginalFilename()),
                    "type", Objects.requireNonNull(file.getContentType())
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi upload: " + e.getMessage());
        }
    }

    // 2. API Lấy lịch sử tin nhắn (Cho chức năng sync khi online lại)
    // Lưu ý: Đường dẫn này phải khớp với Frontend gọi (/api/chat/history hoặc /api/messages/history)
    // Ở đây tôi để /api/chat/history cho đồng bộ với RequestMapping
    @GetMapping("/history")
    @ResponseBody
    public ResponseEntity<List<ChatMessage>> getMyMessageHistory() {
        String currentUser = Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();

        // 1. Lấy tin nhắn cá nhân (1-1)
        List<ChatMessage> personalMsgs = chatMessageRepository.findBySenderIdOrRecipientIdOrderByTimestampAsc(currentUser, currentUser);

        // 2. Lấy tin nhắn của các NHÓM mà tôi tham gia
        List<GroupDetailDTO> myGroups = groupService.getMyGroups(currentUser);
        List<String> groupIds = myGroups.stream().map(g -> String.valueOf(g.getId())).collect(Collectors.toList());

        // (Lưu ý: Repository của bạn cần có hàm findByRecipientIdIn. Nếu chưa có, hãy thêm vào ChatMessageRepository)
        // Nếu không thêm được, tạm thời dùng findByRecipientId cho từng nhóm (hơi chậm)
        List<ChatMessage> groupMsgs = new ArrayList<>();
        if (!groupIds.isEmpty()) {
            // Cách tốt nhất: chatMessageRepository.findByRecipientIdIn(groupIds);
            // Cách tạm thời (nếu lười sửa Repo):
            for (String gid : groupIds) {
                // Giả sử repo có hàm tìm theo RecipientId (là ID nhóm)
                // Bạn có thể dùng hàm findAll() rồi filter stream nếu DB ít (không khuyến khích)
                // Ở đây tôi giả định bạn sẽ thêm hàm findByRecipientIdIn vào Repo cho chuẩn.
                // groupMsgs.addAll(chatMessageRepository.findByRecipientId(gid));
            }
            // --- QUAN TRỌNG: Bạn cần thêm hàm này vào ChatMessageRepository: ---
            // List<ChatMessage> findByRecipientIdIn(List<String> recipientIds);
            try {
                groupMsgs.addAll(chatMessageRepository.findByRecipientIdIn(groupIds));
            } catch (Exception e) {
                System.err.println("Chưa có hàm findByRecipientIdIn trong Repo, vui lòng thêm vào!");
            }
        }

        // 3. LỌC TIN NHẮN NHÓM THEO NGÀY (View Rules)
        // Lấy Map luật xem của user
        Map<String, Date> groupViewRules = new HashMap<>();
        for (GroupDetailDTO gDTO : myGroups) {
            ChatGroup g = chatGroupRepository.findById(gDTO.getId()).orElse(null);
            if (g != null && g.getMemberViewRules().containsKey(currentUser)) {
                groupViewRules.put(String.valueOf(g.getId()), g.getMemberViewRules().get(currentUser));
            }
        }

        groupMsgs.removeIf(msg -> {
            String groupId = msg.getRecipientId();
            if (groupViewRules.containsKey(groupId)) {
                Date allowedDate = groupViewRules.get(groupId);
                // Convert LocalDateTime của msg sang Date để so sánh
                Date msgDate = java.sql.Timestamp.valueOf(msg.getTimestamp());
                return msgDate.before(allowedDate); // Nếu tin nhắn cũ hơn ngày cho phép -> XÓA
            }
            return false;
        });

        // 4. Gộp và Sắp xếp lại
        List<ChatMessage> finalHistory = new ArrayList<>();
        finalHistory.addAll(personalMsgs);
        finalHistory.addAll(groupMsgs);

        finalHistory.sort(Comparator.comparing(ChatMessage::getTimestamp));

        return ResponseEntity.ok(finalHistory);
    }
}