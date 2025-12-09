package com.mosoftvn.chatbox.DTO;

import java.time.LocalDate;
import lombok.Data;

@Data
public class UserUpdateDTO {
    private String fullName;
    private String phone;
    private LocalDate dob;
    private String hometown;
    private String position;

}