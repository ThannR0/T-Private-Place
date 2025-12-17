package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.EventRequest;
import com.mosoftvn.chatbox.DTO.EventResponse;
import com.mosoftvn.chatbox.DTO.ParticipantDTO;
import com.mosoftvn.chatbox.Entity.Event;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.EventRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;

import java.io.IOException;
import java.util.Optional; // Nhớ import Optional

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private NotificationService notificationService;

    // 1. TẠO SỰ KIỆN
    public EventResponse createEvent(String username, EventRequest req, MultipartFile file) {
        User creator = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Event event = new Event();
        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setLocationName(req.getLocationName());
        event.setAddress(req.getAddress());
        event.setLatitude(req.getLatitude());
        event.setLongitude(req.getLongitude());
        event.setStartTime(req.getStartTime());
        event.setCreator(creator);

        if (event.getParticipants() == null) {
            event.setParticipants(new HashSet<>());
        }
        event.getParticipants().add(creator);

        if (file != null && !file.isEmpty()) {
            try {
                String url = cloudinaryService.uploadFile(file);
                event.setImageUrl(url);
            } catch (Exception e) {
                throw new RuntimeException("Lỗi upload ảnh: " + e.getMessage());
            }
        }

        event.setMaxParticipants(req.getMaxParticipants());
        Event savedEvent = eventRepository.save(event);

        // Gửi thông báo mời
        if (req.getInvitedUserIds() != null && !req.getInvitedUserIds().isEmpty()) {
            List<User> invitedUsers = userRepository.findAllById(req.getInvitedUserIds());
            for (User u : invitedUsers) {
                String content = creator.getFullName() + " đã mời bạn tham gia sự kiện: " + event.getTitle();
                notificationService.createNotification(u.getUsername(), content, null);
            }
        }

        return mapToDTO(savedEvent, username);
    }

    // 2. LẤY DANH SÁCH
    public List<EventResponse> getUpcomingEvents(String currentUsername) {
        List<Event> events = eventRepository.findAllByStartTimeAfterOrderByStartTimeAsc(LocalDateTime.now());
        return events.stream().map(e -> mapToDTO(e, currentUsername)).collect(Collectors.toList());
    }

    // 3. THAM GIA / HỦY (LOGIC MỚI: FIX LỖI FULL KHÔNG HỦY ĐƯỢC)
    public void toggleJoin(Long eventId, String username) {
        Event event = eventRepository.findById(eventId).orElseThrow();
        User user = userRepository.findByUsername(username).orElseThrow();

        // Kiểm tra xem User đã tham gia chưa bằng cách so sánh ID (An toàn hơn so sánh Object)
        Optional<User> existingParticipant = event.getParticipants().stream()
                .filter(p -> p.getId().equals(user.getId()))
                .findFirst();

        if (existingParticipant.isPresent()) {
            // A. NẾU ĐÃ THAM GIA -> THÌ HỦY (Bất chấp Full hay không)
            event.getParticipants().remove(existingParticipant.get());
        } else {
            // B. NẾU CHƯA THAM GIA -> KIỂM TRA FULL SLOT
            if (event.getMaxParticipants() != null && event.getParticipants().size() >= event.getMaxParticipants()) {
                throw new RuntimeException("Sự kiện đã hết chỗ!");
            }
            event.getParticipants().add(user);

            // Gửi thông báo cho chủ sự kiện
            if (!event.getCreator().getUsername().equals(username)) {
                String content = user.getFullName() + " sẽ tham gia sự kiện của bạn.";
                notificationService.createNotification(event.getCreator().getUsername(), content, null);
            }
        }
        eventRepository.save(event);
    }

    // 4. XÓA SỰ KIỆN
    public void deleteEvent(Long eventId, String username) {
        Event event = eventRepository.findById(eventId).orElseThrow();
        if (!event.getCreator().getUsername().equals(username)) {
            throw new RuntimeException("Không có quyền xóa!");
        }
        eventRepository.delete(event);
    }

    // 5. UPDATE SỰ KIỆN (LOGIC MỚI: CHECK SỐ LƯỢNG)
    public EventResponse updateEvent(String username, EventRequest req, MultipartFile file) {
        Event event = eventRepository.findById(req.getId())
                .orElseThrow(() -> new RuntimeException("Not found!"));

        if (!event.getCreator().getUsername().equals(username)) {
            throw new RuntimeException("Không có quyền sửa!");
        }

        // --- VALIDATE Không được giảm slot thấp hơn số người đang tham gia ---
        int currentCount = event.getParticipants().size();
        if (req.getMaxParticipants() < currentCount) {
            throw new RuntimeException("Số lượng tối đa (" + req.getMaxParticipants() +
                    ") không được nhỏ hơn số người đang tham gia (" + currentCount + ")!");
        }


        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setStartTime(req.getStartTime());
        event.setLocationName(req.getLocationName());
        event.setAddress(req.getAddress());
        event.setLatitude(req.getLatitude());
        event.setLongitude(req.getLongitude());
        event.setMaxParticipants(req.getMaxParticipants());

        if (file != null && !file.isEmpty()) {
            try {
                String imageUrl = cloudinaryService.uploadFile(file);
                event.setImageUrl(imageUrl);
            } catch (Exception e) {
                throw new RuntimeException("Upload failed: " + e.getMessage());
            }
        }

        Event savedEvent = eventRepository.save(event);
        return mapToDTO(savedEvent, username);
    }

    // 6. GET DETAIL
    public EventResponse getEventById(Long eventId, String username) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Not found"));
        return mapToDTO(event, username);
    }

    // MAPPER
    private EventResponse mapToDTO(Event event, String currentUsername) {
        // Check joined bằng ID luôn cho chắc
        boolean isJoined = event.getParticipants().stream()
                .anyMatch(u -> u.getUsername().equals(currentUsername));

        return EventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .imageUrl(event.getImageUrl())
                .locationName(event.getLocationName())
                .address(event.getAddress())
                .latitude(event.getLatitude())
                .longitude(event.getLongitude())
                .startTime(event.getStartTime())
                .createdAt(event.getCreatedAt())
                .creatorName(event.getCreator().getFullName())
                .creatorAvatar(event.getCreator().getAvatar())
                .creatorId(event.getCreator().getId())
                .participantCount(event.getParticipants().size())
                .isJoined(isJoined)
                .maxParticipants(event.getMaxParticipants())
                .participantsList(event.getParticipants().stream().map(User::getFullName).collect(Collectors.toList()))
                .creatorUsername(event.getCreator().getUsername())
                .participants(event.getParticipants().stream().map(u -> ParticipantDTO.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .avatar(u.getAvatar())
                        .build()).collect(Collectors.toList()))
                .build();
    }
}