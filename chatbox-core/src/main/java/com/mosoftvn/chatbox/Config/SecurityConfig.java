package com.mosoftvn.chatbox.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod; // Nhớ import cái này để dùng HttpMethod.GET
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        System.out.println(">>> CẤU HÌNH BẢO MẬT: ĐANG KÍCH HOẠT FILTER JWT <<<");

        http
                //tẮT CSRF
                .csrf(AbstractHttpConfigurer::disable)

                //CẤU HÌNH CORS (QUAN TRỌNG: CHỈ GIỮ 1 DÒNG NÀY, XÓA DÒNG withDefaults đi)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                //PHÂN QUYỀN URL (Sắp xếp lại thứ tự: Cụ thể trước -> Tổng quát sau)
                .authorizeHttpRequests(auth -> auth
                        // --- NHÓM 1: CÔNG KHAI HOÀN TOÀN ---
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/", "/index.html", "/static/**", "/images/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/api/users/**").permitAll()


                        //Các hành động Thay đổi dữ liệu (Tạo/Sửa/Xóa/Join) -> BẮT BUỘC ĐĂNG NHẬP
                        .requestMatchers(
                                "/api/events/create",
                                "/api/events/update",
                                "/api/events/*/join",
                                "/api/events/*"
                        ).authenticated()

                        //  Xem danh sách/chi tiết -> CÔNG KHAI (Chỉ cho phép GET)
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()

                        // --- NHÓM 3: CÁC API KHÁC ---
//                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
// Chấp nhận chính xác chuỗi "ROLE_ADMIN" hoặc "ROLE_USER" có trong Token
//                                .requestMatchers(HttpMethod.POST, "/api/posts/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_USER")
//                        .requestMatchers(HttpMethod.PUT, "/api/posts/**").hasAnyRole("USER", "ADMIN")
//                        .requestMatchers(HttpMethod.DELETE, "/api/posts/**").hasAnyRole("USER", "ADMIN")
                                .requestMatchers(HttpMethod.POST, "/api/posts/**").authenticated()
                       .requestMatchers("/api/posts/**").permitAll()
                        .requestMatchers("/api/groups/**").permitAll()
                        .requestMatchers("/api/chat/**").permitAll()

                        .requestMatchers("/api/auth/**", "/api/payment/create").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN") //CHỈ ADMIN MỚI ĐƯỢC VÀO ĐÂY

                        // CHỐT CHẶN CUỐI CÙNG
                        .anyRequest().authenticated()
                )
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 1. Cho phép Frontend (Check kỹ port của bạn, ví dụ 5173)
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173"
                ));

        // 2. Cho phép ĐỦ các method
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // 3. SỬA TẠI ĐÂY: Chỉ giữ lại 1 dòng setAllowedHeaders cụ thể này thôi.
        // XÓA DÒNG .setAllowedHeaders(List.of("*")); ĐI NHÉ!
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));

        // 4. Cho phép gửi cookie/credentials
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}