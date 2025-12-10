package com.mosoftvn.chatbox.DTO;

import lombok.Data;
import java.util.List;

@Data
public class GroupRequest {
    //khớp với Frontend { name: "..." }
    private String name;

    //'members' để khớp với Frontend { members: [...] }
    private List<String> members;

    // Biến này dùng cho API xóa/thêm thành viên lẻ
    private String targetUsername;

    private boolean shareHistory;
}