package com.mosoftvn.chatbox.DTO;

import lombok.Data;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Data
public class CreateGroupRequest {
    private String name;
    private List<String> members; // Danh sách username được mời
}