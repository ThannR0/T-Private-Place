package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.GroupDetailDTO;
import com.mosoftvn.chatbox.DTO.GroupRequest;
import com.mosoftvn.chatbox.Service.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    @Autowired
    private GroupService groupService;

    // --- 2. Inject công cụ gửi Socket ---
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Helper: Lấy username hiện tại
    private String getCurrentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @PostMapping("/create")
    public ResponseEntity<GroupDetailDTO> createGroup(@RequestBody GroupRequest req) {
        if (req.getMembers() == null || req.getMembers().isEmpty()) {
            throw new RuntimeException("Danh sách thành viên không được trống");
        }

        GroupDetailDTO newGroup = groupService.createGroup(
                getCurrentUser(),
                req.getName(),
                req.getMembers()
        );

        // Bắn Socket báo có nhóm mới (NEW_GROUP_CREATED) ---
        // Để người tạo và các thành viên thấy nhóm ngay lập tức
        Map<String, Object> socketMsg = new HashMap<>();
        socketMsg.put("type", "NEW_GROUP_CREATED");
        socketMsg.put("group", newGroup); // Gửi cả cục thông tin nhóm về

        messagingTemplate.convertAndSend("/topic/feed", Optional.of(socketMsg));
        // --------------------------------------------------------

        return ResponseEntity.ok(newGroup);
    }

    @GetMapping("/my-groups")
    public List<GroupDetailDTO> getMyGroups() {
        return groupService.getMyGroups(getCurrentUser());
    }

    //  NÂNG CẤP API THÊM THÀNH VIÊN ---
    @PostMapping("/{groupId}/add")
    public ResponseEntity<?> addMembers(@PathVariable Long groupId, @RequestBody GroupRequest req) {
        // A. Gọi Service xử lý logic lưu vào DB (Code cũ)
        groupService.addMembers(groupId, getCurrentUser(), req.getMembers(), req.isShareHistory());

        // B. Lấy thông tin nhóm để biết tên nhóm là gì (Cần thiết cho thông báo)
        GroupDetailDTO groupInfo = groupService.getGroupDetail(groupId);

        // C. Bắn Socket thông báo cho từng người vừa được thêm
        if (req.getMembers() != null) {
            for (String addedUser : req.getMembers()) {
                Map<String, Object> socketMsg = new HashMap<>();
                socketMsg.put("type", "GROUP_MEMBER_ADDED");
                socketMsg.put("groupId", groupId);
                socketMsg.put("realGroupId", groupId);
                socketMsg.put("groupName", groupInfo.getName()); // Lấy tên nhóm từ DTO
                socketMsg.put("addedUser", addedUser); // Tên người được thêm

                socketMsg.put("eventId", System.currentTimeMillis() + "_" + addedUser);
                // Gửi vào kênh chung /topic/feed
                messagingTemplate.convertAndSend("/topic/feed", Optional.of(socketMsg));
            }
        }

        return ResponseEntity.ok("Đã thêm thành viên");
    }

    @PostMapping("/{groupId}/remove")
    public ResponseEntity<?> removeMember(@PathVariable Long groupId, @RequestBody GroupRequest req) {
        groupService.removeMember(groupId, getCurrentUser(), req.getTargetUsername());

        return ResponseEntity.ok("Đã xóa thành viên");
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<?> leaveGroup(@PathVariable Long groupId) {
        groupService.leaveGroup(groupId, getCurrentUser());
        return ResponseEntity.ok("Đã rời nhóm");
    }

    @PutMapping("/{groupId}/transfer-admin")
    public ResponseEntity<?> transferAdmin(@PathVariable Long groupId, @RequestBody Map<String, String> body) {
        String newAdmin = body.get("newAdminUsername");
        groupService.transferAdmin(groupId, getCurrentUser(), newAdmin);
        return ResponseEntity.ok("Đã chuyển quyền trưởng nhóm");
    }

    @PutMapping("/{groupId}/rename")
    public ResponseEntity<?> renameGroup(@PathVariable Long groupId, @RequestBody GroupRequest req) {
        groupService.renameGroup(groupId, getCurrentUser(), req.getName());
        return ResponseEntity.ok("Đã đổi tên nhóm");
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDetailDTO> getDetail(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.getGroupDetail(groupId));
    }
}