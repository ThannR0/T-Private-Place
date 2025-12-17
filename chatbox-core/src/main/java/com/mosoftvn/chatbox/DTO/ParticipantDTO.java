package com.mosoftvn.chatbox.DTO;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ParticipantDTO {
    private Long id;
    private String username;
    private String fullName;
    private String avatar;
}