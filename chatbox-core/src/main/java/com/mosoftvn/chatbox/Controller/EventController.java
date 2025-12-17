package com.mosoftvn.chatbox.Controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mosoftvn.chatbox.DTO.EventRequest;
import com.mosoftvn.chatbox.DTO.EventResponse;
import com.mosoftvn.chatbox.Service.EventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class EventController {

    @Autowired
    private EventService eventService;

    // --- 1. THÊM DÒNG NÀY ĐỂ LẤY MAPPER CỦA SPRING BOOT ---
    @Autowired
    private ObjectMapper objectMapper;
    // -----------------------------------------------------

    @GetMapping
    public List<EventResponse> getEvents() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return eventService.getUpcomingEvents(username);
    }

    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EventResponse createEvent(
            @RequestPart("event") String eventRequestJson,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        try {
            // Dùng objectMapper có sẵn thay vì new ObjectMapper())
            EventRequest req = objectMapper.readValue(eventRequestJson, EventRequest.class);
            // -----------------------------------------------------------------------------

            return eventService.createEvent(username, req, file);
        } catch (Exception e) {
            e.printStackTrace(); // In lỗi ra console để dễ debug
            throw new RuntimeException("Lỗi dữ liệu: " + e.getMessage());
        }
    }

    @PostMapping("/{eventId}/join")
    public void toggleJoin(@PathVariable Long eventId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        eventService.toggleJoin(eventId, username);
    }

    @DeleteMapping("/{eventId}")
    public void deleteEvent(@PathVariable Long eventId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        eventService.deleteEvent(eventId, username);
    }

    @PutMapping(value = "/update", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EventResponse updateEvent(

            @RequestPart("event") String eventRequestJson,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        try {
            EventRequest req = objectMapper.readValue(eventRequestJson, EventRequest.class);
            return eventService.updateEvent(username, req, file);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi cập nhật: " + e.getMessage());
        }
    }
    // ----------------------------

    // Đảm bảo đã có API get chi tiết này
    @GetMapping("/{eventId}")
    public EventResponse getEventById(@PathVariable Long eventId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return eventService.getEventById(eventId, username);
    }
}