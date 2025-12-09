package com.mosoftvn.chatbox.DTO;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserSummary {
    private Long id;
    private String username;
    private String fullName;
    private String avatar;
    private String status;
}