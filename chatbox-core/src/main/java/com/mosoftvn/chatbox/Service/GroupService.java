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

import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroupService {

    @Autowired private ChatGroupRepository groupRepo;
    @Autowired private GroupMemberRepository memberRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // 1. TẠO NHÓM
    @Transactional
    public GroupDetailDTO createGroup(String creatorName, String groupName, List<String> members) {
        User creator = userRepo.findByUsername(creatorName).orElseThrow();

        ChatGroup group = new ChatGroup();
        group.setName(groupName);
        group.setAdminUsername(creatorName);
        group.setAvatar("https://ui-avatars.com/api/?name=" + groupName + "&background=random");

        // Admin luôn được xem từ đầu (Năm 1970)
        group.getMemberViewRules().put(creatorName, new Date(0));

        groupRepo.save(group);

        addMemberToGroup(group, creator);

        if (members != null) {
            for (String username : members) {
                if (!username.equals(creatorName)) {
                    userRepo.findByUsername(username).ifPresent(u -> {
                        addMemberToGroup(group, u);
                        // Thành viên ban đầu cũng xem được hết
                        group.getMemberViewRules().put(username, new Date(0));
                    });
                }
            }
            groupRepo.save(group); // Lưu lại rules
        }

        return getGroupDetail(group.getId());
    }

    public List<GroupDetailDTO> getMyGroups(String username) {
        User user = userRepo.findByUsername(username).orElseThrow();
        List<GroupMember> memberships = memberRepo.findByUser(user);
        return memberships.stream()
                .map(m -> getGroupDetail(m.getGroup().getId()))
                .collect(Collectors.toList());
    }

    // --- 3. THÊM THÀNH VIÊN (CÓ LOGIC CHIA SẺ LỊCH SỬ) ---
    public void addMembers(Long groupId, String currentUsername, List<String> newMembers, boolean shareHistory) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();
        User currentUser = userRepo.findByUsername(currentUsername).orElseThrow();

        if (memberRepo.findByGroupAndUser(group, currentUser).isEmpty()) {
            throw new RuntimeException("Bạn không phải thành viên nhóm này!");
        }

        // Tính toán ngày bắt đầu được xem
        Date viewFromDate = shareHistory ? new Date(0) : new Date(); // 0 = 1970 (xem hết), Now = chỉ xem mới

        for (String username : newMembers) {
            userRepo.findByUsername(username).ifPresent(u -> {
                if (memberRepo.findByGroupAndUser(group, u).isEmpty()) {
                    addMemberToGroup(group, u);

                    // Lưu luật xem vào Map
                    group.getMemberViewRules().put(username, viewFromDate);
                }
            });
        }
        groupRepo.save(group); // Lưu DB
        notifyGroupUpdate(groupId, "MEMBER_ADDED");
    }

    // Các hàm Remove, Leave, Rename giữ nguyên như cũ
    public void removeMember(Long groupId, String currentUsername, String targetUsername) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();
        if (currentUsername.equals(targetUsername)) { leaveGroup(groupId, currentUsername); return; }
        if (!group.getAdminUsername().equals(currentUsername)) throw new RuntimeException("Chỉ trưởng nhóm mới được xóa!");

        User targetUser = userRepo.findByUsername(targetUsername).orElseThrow();
        GroupMember membership = memberRepo.findByGroupAndUser(group, targetUser).orElseThrow();
        memberRepo.delete(membership);

        // Xóa rule của người bị kick
        group.getMemberViewRules().remove(targetUsername);
        groupRepo.save(group);

        notifyGroupUpdate(groupId, "MEMBER_REMOVED");
    }

    public void leaveGroup(Long groupId, String username) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();
        User user = userRepo.findByUsername(username).orElseThrow();
        GroupMember membership = memberRepo.findByGroupAndUser(group, user).orElseThrow();
        memberRepo.delete(membership);

        group.getMemberViewRules().remove(username);
        groupRepo.save(group);

        notifyGroupUpdate(groupId, "MEMBER_LEFT");
    }

    public void renameGroup(Long groupId, String currentUsername, String newName) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();
        group.setName(newName);
        group.setAvatar("https://ui-avatars.com/api/?name=" + newName + "&background=random");
        groupRepo.save(group);
        notifyGroupUpdate(groupId, "GROUP_RENAMED");
    }

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
                .map(m -> new UserSummary(m.getUser().getId(), m.getUser().getUsername(), m.getUser().getFullName(), m.getUser().getAvatar(), m.getUser().getStatus()))
                .collect(Collectors.toList());
        return new GroupDetailDTO(group.getId(), group.getName(), group.getAvatar(), group.getAdminUsername(), memberDTOs);
    }

    public void transferAdmin(Long groupId, String currentAdmin, String newAdminUsername) {
        ChatGroup group = groupRepo.findById(groupId).orElseThrow();

        // Check quyền: Phải là Admin hiện tại mới được chuyển
        if (!group.getAdminUsername().equals(currentAdmin)) {
            throw new RuntimeException("Bạn không phải trưởng nhóm!");
        }

        // Check thành viên: Người mới phải ở trong nhóm
        User newAdmin = userRepo.findByUsername(newAdminUsername).orElseThrow();
        if (memberRepo.findByGroupAndUser(group, newAdmin).isEmpty()) {
            throw new RuntimeException("Người này không ở trong nhóm!");
        }

        // Chuyển quyền
        group.setAdminUsername(newAdminUsername);
        groupRepo.save(group);

        // Bắn socket thông báo
        notifyGroupUpdate(groupId, "ADMIN_CHANGED");
    }

    private void notifyGroupUpdate(Long groupId, String action) {
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/update", Optional.of(Map.of("action", action, "groupId", groupId)));
    }
}