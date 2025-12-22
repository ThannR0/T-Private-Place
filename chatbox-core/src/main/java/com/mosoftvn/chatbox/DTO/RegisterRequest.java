package com.mosoftvn.chatbox.DTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;


@Setter
@Getter
public class RegisterRequest {
    private String username;
    private String password;
    private String email;

    private String fullName;
    // ------------------

    // Constructor mặc định
    public RegisterRequest() {
    }

    // Constructor đầy đủ
    public RegisterRequest(String username, String password, String email, String fullName) {
        this.username = username;
        this.password = password;
        this.email = email;
        this.fullName = fullName;
    }

}