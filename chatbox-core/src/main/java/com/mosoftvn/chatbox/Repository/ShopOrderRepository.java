package com.mosoftvn.chatbox.Repository;

import com.mosoftvn.chatbox.Entity.ShopOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShopOrderRepository extends JpaRepository<ShopOrder, Long> {
    List<ShopOrder> findByBuyerUsername(String username);
    List<ShopOrder> findBySellerUsername(String username);
}
