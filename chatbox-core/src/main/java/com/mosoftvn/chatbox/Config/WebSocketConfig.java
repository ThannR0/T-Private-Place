package com.mosoftvn.chatbox.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // ws://localhost:8081/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Cho phép mọi nguồn kết nối (để dễ test)
                .withSockJS(); // Hỗ trợ dự phòng nếu trình duyệt không có WebSocket
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Server gửi tin nhắn về Client qua đường dẫn bắt đầu bằng /user
        registry.enableSimpleBroker("/user", "/topic");

        // Client gửi tin nhắn lên Server qua đường dẫn bắt đầu bằng /app
        registry.setApplicationDestinationPrefixes("/app");

        // Cấu hình tiền tố cho tin nhắn riêng tư (1-1)
        registry.setUserDestinationPrefix("/user");
    }
}