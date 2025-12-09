package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.GroupDetailDTO;
import com.mosoftvn.chatbox.DTO.GroupRequest;
import com.mosoftvn.chatbox.Service.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    @Autowired private GroupService groupService;

    // Helper: Lấy username hiện tại
    private String getCurrentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @PostMapping("/create")
    public ResponseEntity<GroupDetailDTO> createGroup(@RequestBody GroupRequest req) {
        // Kiểm tra dữ liệu đầu vào
        if (req.getMembers() == null || req.getMembers().isEmpty()) {
            throw new RuntimeException("Danh sách thành viên không được trống");
        }

        // Gọi service với getter mới: getName(), getMembers()
        return ResponseEntity.ok(groupService.createGroup(
                getCurrentUser(),
                req.getName(),
                req.getMembers()
        ));
    }
    @GetMapping("/my-groups")
    public List<GroupDetailDTO> getMyGroups() {
        return groupService.getMyGroups(getCurrentUser());
    }

    @PostMapping("/{groupId}/add")
    public ResponseEntity<?> addMembers(@PathVariable Long groupId, @RequestBody GroupRequest req) {
        groupService.addMembers(groupId, getCurrentUser(), req.getMembers()); // Getter mới
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

    @PutMapping("/{groupId}/rename")
    public ResponseEntity<?> renameGroup(@PathVariable Long groupId, @RequestBody GroupRequest req) {
        // Getter mới: getName()
        groupService.renameGroup(groupId, getCurrentUser(), req.getName());
        return ResponseEntity.ok("Đã đổi tên nhóm");
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDetailDTO> getDetail(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.getGroupDetail(groupId));
    }
}