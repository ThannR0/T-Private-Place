package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.Shop;
import com.mosoftvn.chatbox.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {
    Optional<Shop> findByOwner(User owner);
    Optional<Shop> findByOwner_Username(String username);
    boolean existsByOwner(User owner);
}