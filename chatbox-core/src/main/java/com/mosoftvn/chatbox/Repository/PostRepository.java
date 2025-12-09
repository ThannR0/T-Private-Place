package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    // Lấy tất cả bài viết, sắp xếp mới nhất lên đầu
    List<Post> findAllByOrderByCreatedAtDesc();
}