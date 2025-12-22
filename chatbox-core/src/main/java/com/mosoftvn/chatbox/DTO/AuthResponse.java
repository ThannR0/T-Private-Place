package com.mosoftvn.chatbox.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Data
@AllArgsConstructor
public class AuthResponse
{
    private String token;
    private String username;
    private String fullName;
    private String avatar;

    private String role;

    private Double balance;
    private Double totalDeposited;
}
