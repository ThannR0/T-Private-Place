package com.mosoftvn.chatbox.Entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "chat_groups")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String avatar;
    private String adminUsername;
    private LocalDateTime createdAt = LocalDateTime.now();

    // --- QUAN TRỌNG: CẤU HÌNH LƯU MAP VÀO DB ---
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "group_member_rules", joinColumns = @JoinColumn(name = "group_id"))
    @MapKeyColumn(name = "username")
    @Column(name = "view_from_date")
    private Map<String, Date> memberViewRules = new HashMap<>();
}