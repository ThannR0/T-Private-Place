package com.mosoftvn.chatbox.Config;

import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // Kiểm tra xem có nhận được Header không
        if (authHeader == null) {
            System.out.println("LOG: Không thấy Header Authorization đâu cả!");
            filterChain.doFilter(request, response);
            return;
        }

        if (!authHeader.startsWith("Bearer ")) {
            System.out.println("LOG: Header có gửi nhưng sai định dạng (Thiếu Bearer ): " + authHeader);
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        final String username;

        try {
            username = jwtUtil.extractUsername(jwt);
            System.out.println("LOG: Đã đọc được user từ Token: " + username);
        } catch (Exception e) {
            System.out.println("LOG: Token lỗi, không đọc được tên! " + e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            User user = userRepository.findByUsername(username).orElse(null);

            if (user == null) {
                System.out.println("LOG: User '" + username + "' có trong Token nhưng KHÔNG TÌM THẤY trong Database (Có thể đã bị xóa?)");
            } else {
                if (jwtUtil.validateToken(jwt, user.getUsername())) {
                    System.out.println("LOG: Token HỢP LỆ! Đang cấp quyền vào cửa...");

                    // Chú ý: Kiểm tra null ở getRole()
                    String roleName = (user.getRole() != null) ? user.getRole().getName() : "ROLE_USER";

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            user.getUsername(),
                            null,
                            List.of(new SimpleGrantedAuthority(roleName))
                    );

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    System.out.println("LOG: Xác thực thành công cho: " + username);
                } else {
                    System.out.println("LOG: Token hết hạn hoặc không khớp user!");
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}