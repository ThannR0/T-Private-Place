package com.mosoftvn.chatbox.DTO;
import lombok.Data;

@Data
public class ReviewDTO {
    private Long productId;
    private Integer rating;
    private String comment;
}