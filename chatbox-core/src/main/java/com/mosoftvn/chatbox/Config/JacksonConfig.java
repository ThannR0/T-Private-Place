package com.mosoftvn.chatbox.Config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary // Đánh dấu đây là Bean ưu tiên dùng
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // 1. Đăng ký Module để hiểu được LocalDateTime (Sửa lỗi trước đó)
        mapper.registerModule(new JavaTimeModule());

        // 2. Cấu hình để ngày tháng hiển thị dạng chuỗi chuẩn ISO thay vì số timestamp
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        return mapper;
    }
}