package com.mosoftvn.chatbox.DTO;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Data
public class ProductDTO {
    private String name;
    private String description;
    private Double price;
    private Integer quantity;
    private String category;

    private Double shippingFee;

    private List<MultipartFile> images;
}