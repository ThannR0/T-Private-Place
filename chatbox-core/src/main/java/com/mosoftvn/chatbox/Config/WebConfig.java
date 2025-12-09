package com.mosoftvn.chatbox.Config;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/images/chat/**")
                .addResourceLocations("file:uploads/chat/");
        // Ánh xạ đường dẫn URL "/images/**" vào thư mục "uploads/" trên máy
        registry.addResourceHandler("/images/**")
                .addResourceLocations("file:uploads/");
    }
}
