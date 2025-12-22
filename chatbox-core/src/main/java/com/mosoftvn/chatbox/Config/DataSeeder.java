package com.mosoftvn.chatbox.Config;

import com.mosoftvn.chatbox.Entity.Role;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.RoleRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Override
    public void run(String... args) throws Exception {
        // 1. Tạo Role chuẩn (Thêm tiền tố ROLE_)
        createRoleIfNotFound("ROLE_ADMIN");
        createRoleIfNotFound("ROLE_USER");

        // 2. Logic Thăng chức Admin
        if (adminEmail == null || adminEmail.isEmpty()) return;

        System.out.println("--- CHECKING FOR ADMIN PROMOTION ---");
        Optional<User> userOpt = userRepository.findByEmail(adminEmail);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // Lấy Role chuẩn ROLE_ADMIN
            Role adminRole = roleRepository.findByName("ROLE_ADMIN").orElse(null);
            Role currentRole = user.getRole();

            // Nếu chưa có role hoặc role hiện tại KHÔNG PHẢI là ROLE_ADMIN
            // (Kể cả đang là "ADMIN" cũ cũng sẽ bị đổi thành "ROLE_ADMIN" mới)
            if (adminRole != null && (currentRole == null || !currentRole.getName().equals("ROLE_ADMIN"))) {
                user.setRole(adminRole);
                userRepository.save(user);
                System.out.println("✅ SUCCESS: User promoted to ROLE_ADMIN!");
            } else {
                System.out.println("ℹ️ INFO: User is already ROLE_ADMIN.");
            }
        }
        System.out.println("------------------------------------");
    }

    private void createRoleIfNotFound(String name) {
        if (roleRepository.findByName(name).isEmpty()) {
            Role role = new Role();
            role.setName(name);
            roleRepository.save(role);
            System.out.println("Initialize Role: " + name);
        }
    }
}