package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description; // Hỗ trợ văn bản dài/trang trí

    private String imageUrl; // Ảnh bìa sự kiện

    // ---  (GOOGLE MAPS) ---
    private String locationName; // Tên địa điểm
    private String address;      // Địa chỉ cụ thể
    private Double latitude;     // Vĩ độ (Để ghim map)
    private Double longitude;    // Kinh độ (Để ghim map)
    private Integer maxParticipants;
    // ---------------------------------

    private LocalDateTime startTime; // Giờ diễn ra

    private LocalDateTime createdAt;

    // Người tạo sự kiện
    @ManyToOne
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    // Danh sách người tham gia (ManyToMany)
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "event_participants",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> participants = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}