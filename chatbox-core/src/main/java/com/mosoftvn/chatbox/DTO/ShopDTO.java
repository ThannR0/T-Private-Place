package com.mosoftvn.chatbox.DTO;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class ShopDTO {
    private String shopName;
    private String address;
    private String phoneNumber;
    private String description;

    private MultipartFile avatar;
}