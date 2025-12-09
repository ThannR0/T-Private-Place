package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.GroupMember;
import com.mosoftvn.chatbox.Entity.ChatGroup;
import com.mosoftvn.chatbox.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    // Tìm danh sách nhóm mà User này tham gia
    List<GroupMember> findByUser(User user);

    // Tìm tất cả thành viên trong 1 nhóm
    List<GroupMember> findByGroup(ChatGroup group);

    // Tìm chính xác 1 thành viên trong 1 nhóm (để check tồn tại hoặc xóa)
    Optional<GroupMember> findByGroupAndUser(ChatGroup group, User user);

    // Xóa tất cả thành viên khi giải tán nhóm
    void deleteByGroup(ChatGroup group);
}