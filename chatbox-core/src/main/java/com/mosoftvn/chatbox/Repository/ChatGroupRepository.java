package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {
}