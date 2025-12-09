package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Tìm user theo username
    Optional<User> findByUsername(String username);

    // dùng cho chức năng Verify OTP
    Optional<User> findByEmail(String email);
    // -------------------------------

    // Kiểm tra tồn tại
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}