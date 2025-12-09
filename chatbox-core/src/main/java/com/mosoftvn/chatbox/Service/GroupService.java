package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.GroupDetailDTO;
import com.mosoftvn.chatbox.DTO.UserSummary;
import com.mosoftvn.chatbox.Entity.ChatGroup;
import com.mosoftvn.chatbox.Entity.GroupMember;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.ChatGroupRepository;
import com.mosoftvn.chatbox.Repository.GroupMemberRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GroupService {

    @Autowired private ChatGroupRepository groupRepo;
    @Autowired private GroupMemberRepository memberRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private SimpMessagingTemplate messagingTemplate; // Để bắn socket

    // 1. TẠO NHÓM
    @Transactional
    public GroupDetailDTO createGroup(String creatorName, String groupName, List<String> members) {
        User creator = userRepo.findByUsername(creatorName).orElseThrow();

        ChatGroup group = new ChatGroup();
        group.setName(groupName);
        group.setAdminUsername(creatorName);
        group.setAvatar("https://ui-avatars.com/api/?name=" + groupName + "&background=random");
        groupRepo.save(group);

        addMemberToGroup(group, creator);

        // --- THÊM KIỂM TRA NULL ---
        if (members != null) {
            for (String username : members) {
                // Tránh thêm trùng người tạo
                if (!username.equals(creatorName)) {
                    userRepo.findByUsername(username).ifPresent(u -> addMemberToGroup(group, u));
                }
            }
        }
        // --------------------------

        return getGroupDetail(group.getId());
    }

    // 2. LẤY DANH SÁCH NHÓM CỦA TÔI
    public List<GroupDetailDTO> getMyGroups(String username) {
        User user = userRepo.findByUsername(username).orElseThrow();
        List<GroupMember> memberships = memberRepo.findByUser(user);

        return memberships.stream()
                .map(m -> getGroupDetail(m.getGroup().getId()))
                .collect(Collectors.toList());
    }

    // 3. THÊM THÀNH VIÊN (Ai trong nhóm cũng thêm được)
    public void addMembers(Long groupId, String currentUsername, List<String> newMembers) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();
        User currentUser = userRepo.findByUsername(currentUsername).orElseThrow();

        // Check: Người thực hiện có trong nhóm không?
        if (memberRepo.findByGroupAndUser(group, currentUser).isEmpty()) {
            throw new RuntimeException("Bạn không phải thành viên nhóm này!");
        }

        for (String username : newMembers) {
            userRepo.findByUsername(username).ifPresent(u -> {
                // Chỉ thêm nếu chưa có trong nhóm
                if (memberRepo.findByGroupAndUser(group, u).isEmpty()) {
                    addMemberToGroup(group, u);
                }
            });
        }
        notifyGroupUpdate(groupId, "MEMBER_ADDED");
    }

    // 4. XÓA THÀNH VIÊN (Chỉ Admin mới được xóa người khác)
    public void removeMember(Long groupId, String currentUsername, String targetUsername) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();

        // Nếu tự rời nhóm
        if (currentUsername.equals(targetUsername)) {
            leaveGroup(groupId, currentUsername);
            return;
        }

        // Nếu đá người khác -> Phải là Admin
        if (!group.getAdminUsername().equals(currentUsername)) {
            throw new RuntimeException("Chỉ trưởng nhóm mới được xóa thành viên!");
        }

        User targetUser = userRepo.findByUsername(targetUsername).orElseThrow();
        GroupMember membership = memberRepo.findByGroupAndUser(group, targetUser)
                .orElseThrow(() -> new RuntimeException("Người này không trong nhóm"));

        memberRepo.delete(membership);
        notifyGroupUpdate(groupId, "MEMBER_REMOVED");
    }

    // 5. RỜI NHÓM (Ai cũng được rời)
    public void leaveGroup(Long groupId, String username) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();
        User user = userRepo.findByUsername(username).orElseThrow();

        GroupMember membership = memberRepo.findByGroupAndUser(group, user)
                .orElseThrow(() -> new RuntimeException("Bạn không trong nhóm này"));

        memberRepo.delete(membership);

        // Logic phụ: Nếu Admin rời nhóm -> Chọn người khác làm Admin hoặc giải tán (để đơn giản ta giữ nguyên nhóm)
        notifyGroupUpdate(groupId, "MEMBER_LEFT");
    }

    // 6. ĐỔI TÊN NHÓM (Ai cũng được đổi - giống Messenger)
    public void renameGroup(Long groupId, String currentUsername, String newName) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();
        // Check quyền thành viên
        User currentUser = userRepo.findByUsername(currentUsername).orElseThrow();
        if (memberRepo.findByGroupAndUser(group, currentUser).isEmpty()) {
            throw new RuntimeException("Bạn không phải thành viên!");
        }

        group.setName(newName);
        // Cập nhật avatar theo tên mới luôn cho đẹp
        group.setAvatar("https://ui-avatars.com/api/?name=" + newName + "&background=random");
        groupRepo.save(group);

        notifyGroupUpdate(groupId, "GROUP_RENAMED");
    }

    // --- HÀM PHỤ TRỢ ---
    private void addMemberToGroup(ChatGroup group, User user) {
        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setUser(user);
        memberRepo.save(member);
    }

    public GroupDetailDTO getGroupDetail(Long groupId) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();
        List<GroupMember> members = memberRepo.findByGroup(group);

        List<UserSummary> memberDTOs = members.stream()
                .map(m -> new UserSummary(
                        m.getUser().getId(),
                        m.getUser().getUsername(),
                        m.getUser().getFullName(),
                        m.getUser().getAvatar(),
                        m.getUser().getStatus()
                )).collect(Collectors.toList());

        return new GroupDetailDTO(
                group.getId(),
                group.getName(),
                group.getAvatar(),
                group.getAdminUsername(),
                memberDTOs
        );
    }

    // Bắn socket báo Frontend cập nhật lại danh sách nhóm
    private void notifyGroupUpdate(Long groupId, String action) {
        // Gửi thông báo chung vào topic nhóm để mọi người reload lại thông tin nhóm
        // Frontend sẽ nghe: /topic/group/{groupId}/update
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/update",
                Optional.of(Map.of("action", action, "groupId", groupId)));
    }
}