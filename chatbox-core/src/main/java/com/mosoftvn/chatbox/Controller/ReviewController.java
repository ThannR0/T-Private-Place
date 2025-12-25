package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.ReviewDTO;
import com.mosoftvn.chatbox.Service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/market/reviews")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @PostMapping("/create")
    public ResponseEntity<?> createReview(@RequestBody ReviewDTO dto, Authentication authentication) {
        try {
            return ResponseEntity.ok(reviewService.createReview(dto, authentication.getName()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}