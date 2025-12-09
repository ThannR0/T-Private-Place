package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_groups")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String avatar;

    // Lưu username của trưởng nhóm (người có quyền xóa thành viên)
    private String adminUsername;

    private LocalDateTime createdAt = LocalDateTime.now();
}