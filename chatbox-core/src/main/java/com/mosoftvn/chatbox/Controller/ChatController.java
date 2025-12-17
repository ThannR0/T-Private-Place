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

        String rawGroupId = message.getRecipientId().replace("GROUP_", "");
        message.setRecipientId(rawGroupId);

        // B. Gán Type cứng là GROUP (để sau này lọc cho dễ)
        message.setType("GROUP");
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

    //API Lấy lịch sử tin nhắn (Cho chức năng sync khi online lại)
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

    // 1. API THU HỒI (Sửa lại để bắn socket chuẩn)
    @PostMapping("/{msgId}/revoke")
    public ResponseEntity<?> revokeMessage(@PathVariable String msgId) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        ChatMessage msg = chatMessageRepository.findById(msgId).orElseThrow();

        if (!msg.getSenderId().equals(currentUser)) return ResponseEntity.status(403).body("Không chính chủ");

        msg.setRevoked(true);
        msg.setContent("Tin nhắn đã bị thu hồi");
        msg.setFileUrl(null);
        msg.setFileName(null); // Xóa luôn thông tin file
        chatMessageRepository.save(msg);

        // Bắn vào /topic/feed
        messagingTemplate.convertAndSend("/topic/feed", Optional.of(Map.of("type", "MSG_UPDATE", "msg", msg)));

        return ResponseEntity.ok(msg);
    }

    // 2. API GHIM (Sửa lại bắn socket)
    @PostMapping("/{msgId}/pin")
    public ResponseEntity<?> pinMessage(@PathVariable String msgId) {
        ChatMessage msg = chatMessageRepository.findById(msgId).orElseThrow();

        // Chỉ chạy logic này nếu ta đang chuẩn bị GHIM (từ chưa ghim -> ghim)
        if (!msg.isPinned()) {
            List<ChatMessage> oldPinnedMessages = new java.util.ArrayList<>();

            // A. Nếu là tin nhắn NHÓM
            // (Kiểm tra bằng type hoặc ID nhóm)
            if ("GROUP".equals(msg.getType()) || msg.getRecipientId().startsWith("GROUP_") || msg.getRecipientId().matches("\\d+")) {
                oldPinnedMessages.addAll(chatMessageRepository.findByRecipientIdAndIsPinnedTrue(msg.getRecipientId()));
            }
            // B. Nếu là tin nhắn 1-1 (Cá nhân)
            else {
                // Tìm tin ghim chiều đi (A -> B)
                oldPinnedMessages.addAll(chatMessageRepository.findBySenderIdAndRecipientIdAndIsPinnedTrue(msg.getSenderId(), msg.getRecipientId()));
                // Tìm tin ghim chiều về (B -> A)
                oldPinnedMessages.addAll(chatMessageRepository.findBySenderIdAndRecipientIdAndIsPinnedTrue(msg.getRecipientId(), msg.getSenderId()));
            }

            // Thực hiện bỏ ghim và bắn socket cập nhật ngay
            for (ChatMessage oldMsg : oldPinnedMessages) {
                // Trừ tin nhắn hiện tại ra (đề phòng)
                if (!oldMsg.getId().equals(msg.getId())) {
                    oldMsg.setPinned(false);
                    chatMessageRepository.save(oldMsg);

                    // Bắn Socket báo cho Frontend biết tin này đã bị bỏ ghim -> Mất icon ghim
                    messagingTemplate.convertAndSend("/topic/feed", Optional.of(Map.of("type", "MSG_UPDATE", "msg", oldMsg)));
                }
            }
        }
        // -------------------------------------

        // Toggle trạng thái của tin nhắn hiện tại
        msg.setPinned(!msg.isPinned());
        chatMessageRepository.save(msg);

        // Bắn Socket báo tin này đã được ghim/bỏ ghim
        messagingTemplate.convertAndSend("/topic/feed", Optional.of(Map.of("type", "MSG_UPDATE", "msg", msg)));

        return ResponseEntity.ok(msg);
    }

    // 2. CHỈNH SỬA TIN NHẮN
    @PutMapping("/{msgId}")
    public ResponseEntity<?> editMessage(@PathVariable String msgId, @RequestBody Map<String, String> body) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        ChatMessage msg = chatMessageRepository.findById(msgId).orElseThrow();

        if (!msg.getSenderId().equals(currentUser)) return ResponseEntity.status(403).body("Không chính chủ");

        msg.setContent(body.get("content"));
        msg.setEdited(true);
        chatMessageRepository.save(msg);

        messagingTemplate.convertAndSend("/topic/public", Optional.of(Map.of("type", "MSG_UPDATE", "msg", msg)));
        return ResponseEntity.ok(msg);
    }

    // 3. API CHUYỂN TIẾP (Viết Mới)
    @PostMapping("/forward")
    public ResponseEntity<?> forwardMessage(@RequestBody Map<String, String> body) {
        String originalMsgId = body.get("originalMsgId");
        String rawTarget = body.get("targetUsername");
        String currentSender = SecurityContextHolder.getContext().getAuthentication().getName();

        ChatMessage original = chatMessageRepository.findById(originalMsgId).orElseThrow();

        // Xử lý ID nhóm/người nhận
        String finalRecipientId = rawTarget.startsWith("GROUP_") ? rawTarget.replace("GROUP_", "") : rawTarget;
        boolean isGroup = rawTarget.startsWith("GROUP_");

        ChatMessage newMsg = new ChatMessage();
        newMsg.setSenderId(currentSender);
        newMsg.setRecipientId(finalRecipientId);

        // --- LOGIC MỚI: THÊM HEADER CHUYỂN TIẾP ---
        String forwardPrefix = "[Chuyển tiếp từ " + original.getSenderId() + "]:\n";
        newMsg.setContent(forwardPrefix + (original.getContent() != null ? original.getContent() : ""));
        // ------------------------------------------

        newMsg.setFileUrl(original.getFileUrl());
        newMsg.setFileName(original.getFileName());
        newMsg.setFileType(original.getFileType());
        newMsg.setTimestamp(java.time.LocalDateTime.now());
        if (isGroup) newMsg.setType("GROUP");

        chatMessageRepository.save(newMsg);

        // Bắn Socket
        if (isGroup) {
            messagingTemplate.convertAndSend("/topic/group/" + finalRecipientId, newMsg);
        } else {
            messagingTemplate.convertAndSendToUser(finalRecipientId, "/queue/messages", newMsg);
            messagingTemplate.convertAndSendToUser(currentSender, "/queue/messages", newMsg);
        }
        return ResponseEntity.ok("Đã chuyển tiếp");
    }

    // 4. API THẢ CẢM XÚC (REACTION)
    @PostMapping("/{msgId}/react")
    public ResponseEntity<?> reactToMessage(@PathVariable String msgId, @RequestBody Map<String, String> body) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        String emoji = body.get("emoji");

        ChatMessage msg = chatMessageRepository.findById(msgId).orElseThrow();

        // Logic Toggle:
        if (msg.getReactions() == null) {
            msg.setReactions(new java.util.HashMap<>());
        }

        String currentReaction = msg.getReactions().get(currentUser);

        if (currentReaction != null && currentReaction.equals(emoji)) {
            // Nếu đã thả icon này rồi -> Gỡ bỏ (Unlike)
            msg.getReactions().remove(currentUser);
        } else {
            // Nếu chưa thả hoặc thả icon khác -> Cập nhật
            msg.getReactions().put(currentUser, emoji);
        }

        chatMessageRepository.save(msg);

        // Bắn Socket cập nhật ngay lập tức (Dùng kênh /topic/feed)
        messagingTemplate.convertAndSend("/topic/feed", Optional.of(Map.of("type", "MSG_UPDATE", "msg", msg)));

        return ResponseEntity.ok(msg);
    }
}