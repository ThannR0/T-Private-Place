package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    // chưa cần hàm custom nào
}