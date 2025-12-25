package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.OrderDTO;
import com.mosoftvn.chatbox.Entity.*;
import com.mosoftvn.chatbox.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ShopOrderService {
    @Autowired private ShopOrderRepository orderRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private VoucherRepository voucherRepository;
    @Autowired private ShopOrderRepository shopOrderRepository;
    @Autowired private ShopRepository shopRepository;

    // 1. TẠO ĐƠN HÀNG (Giữ nguyên logic cũ)
    @Transactional
    public ShopOrder createOrder(OrderDTO req, String buyerUsername) {
        User buyer = userRepository.findByUsername(buyerUsername)
                .orElseThrow(() -> new RuntimeException("Người mua không tồn tại"));
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại"));

        // Validate cơ bản
        if (product.getStatus() != ProductStatus.APPROVED) throw new RuntimeException("Sản phẩm chưa được bán!");
        if (product.getQuantity() < req.getQuantity()) throw new RuntimeException("Hết hàng!");
        if (product.getSeller().getUsername().equals(buyerUsername)) throw new RuntimeException("Không thể tự mua hàng của mình!");

        // Tính toán tiền
        double total = product.getPrice() * req.getQuantity();
        double discount = 0;

        if (req.getVoucherCode() != null && !req.getVoucherCode().isEmpty()) {
            Voucher v = voucherRepository.findByCodeAndOwnerUsername(req.getVoucherCode(), buyerUsername)
                    .orElseThrow(() -> new RuntimeException("Voucher không hợp lệ hoặc không phải của bạn"));
            if (v.isUsed() || v.getExpiryDate().isBefore(LocalDateTime.now()))
                throw new RuntimeException("Voucher hết hạn hoặc đã sử dụng");

            discount = total * v.getDiscountPercent();
            v.setUsed(true); // Đánh dấu đã dùng
            voucherRepository.save(v);
        }

        double finalAmount = total - discount;

        // TRỪ TIỀN NGƯỜI MUA (Tiền tạm giữ ở hệ thống, chưa qua người bán)
        if (buyer.getBalance() < finalAmount) throw new RuntimeException("Số dư không đủ! Vui lòng nạp thêm Than.");
        buyer.setBalance(buyer.getBalance() - finalAmount);
        userRepository.save(buyer);

        // TRỪ KHO HÀNG
        product.setQuantity(product.getQuantity() - req.getQuantity());
        productRepository.save(product);

        // Lưu đơn hàng
        ShopOrder order = new ShopOrder();
        order.setOrderCode("ORD_" + System.currentTimeMillis());
        order.setBuyer(buyer);
        order.setSeller(product.getSeller());
        order.setShop(product.getShop());
        order.setTotalAmount(total);
        order.setDiscountAmount(discount);
        order.setFinalAmount(finalAmount);
        order.setStatus(OrderStatus.PREPARING); // Trạng thái ban đầu
        order.setOrderDate(LocalDateTime.now());
        order.setShippingAddress(req.getAddress()); // Giả sử DTO có field này

        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(req.getQuantity());
        item.setPriceAtPurchase(product.getPrice());
        item.setOrder(order);

        order.setItems(List.of(item));

        return orderRepository.save(order);
    }

    // 2. CẬP NHẬT TRẠNG THÁI (Đã sửa đổi logic quyền hạn và tính toán)
    @Transactional
    public void updateStatus(Long orderId, OrderStatus newStatus, String username) {
        ShopOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        OrderStatus current = order.getStatus();
        // User currentUser = userRepository.findByUsername(username).orElseThrow(); // Dòng này có thể bỏ nếu không dùng đến object User

        // Kiểm tra logic chuyển trạng thái
        switch (newStatus) {

            // --- CASE 1: NGƯỜI BÁN GỬI HÀNG (Seller) ---
            case SHIPPED:
                if (!order.getSeller().getUsername().equals(username))
                    throw new RuntimeException("Chỉ người bán được xác nhận gửi hàng");
                if (current != OrderStatus.PREPARING)
                    throw new RuntimeException("Đơn hàng phải ở trạng thái Chuẩn bị mới được gửi");
                break;

            // --- CASE 2: KHÁCH ĐÃ NHẬN HÀNG (Buyer) ---
            // 🟢 SỬA: Cho phép Buyer xác nhận đã nhận hàng (từ trang MyOrders)
            case DELIVERED:
                if (!order.getBuyer().getUsername().equals(username))
                    throw new RuntimeException("Chỉ người mua mới được xác nhận đã nhận hàng");
                if (current != OrderStatus.SHIPPED)
                    throw new RuntimeException("Đơn chưa gửi thì sao đã nhận được?");
                break;

            // --- CASE 3: HOÀN TẤT ĐƠN HÀNG (Seller duyệt) ---
            // 🟢 SỬA: Người bán duyệt đơn thành công -> Cộng tiền & Số lượng bán
            case COMPLETED:
                if (!order.getSeller().getUsername().equals(username))
                    throw new RuntimeException("Chỉ Shop mới có quyền duyệt hoàn tất đơn hàng");
                if (current != OrderStatus.DELIVERED)
                    throw new RuntimeException("Khách chưa xác nhận nhận hàng, không thể hoàn tất!");

                // 1. CỘNG SỐ LƯỢNG ĐÃ BÁN (SOLD) CHO TỪNG SẢN PHẨM
                for (OrderItem item : order.getItems()) {
                    Product p = item.getProduct();
                    int currentSold = p.getSold() == null ? 0 : p.getSold();
                    p.setSold(currentSold + item.getQuantity());
                    productRepository.save(p);
                }

                // 2. CẬP NHẬT TỔNG SỐ LƯỢNG BÁN CỦA SHOP
                Shop shop = order.getShop();
                // Lưu ý: Cần đảm bảo ProductRepository đã có hàm sumSoldByShop như hướng dẫn trước
                Integer totalShopSold = productRepository.sumSoldByShop(shop.getId());
                shop.setTotalSold(totalShopSold != null ? totalShopSold : 0);
                shopRepository.save(shop); // Nhớ Inject ShopRepository vào Service

                // 3. CỘNG TIỀN CHO NGƯỜI BÁN
                User seller = order.getSeller();
                seller.setBalance(seller.getBalance() + order.getFinalAmount());
                userRepository.save(seller);

                order.setCompletedDate(LocalDateTime.now());
                break;

            // --- CASE 4: HỦY ĐƠN (Hoàn tiền ngay cho Buyer) ---
            case CANCELLED:
                boolean isBuyer = order.getBuyer().getUsername().equals(username);
                boolean isSeller = order.getSeller().getUsername().equals(username);

                if (!isBuyer && !isSeller) throw new RuntimeException("Bạn không có quyền hủy đơn này");
                if (current != OrderStatus.PREPARING) throw new RuntimeException("Hàng đã gửi đi, không thể hủy!");

                // Hoàn tiền cho người mua
                User buyer = order.getBuyer();
                buyer.setBalance(buyer.getBalance() + order.getFinalAmount());
                userRepository.save(buyer);

                // Hoàn lại kho hàng
                restoreInventory(order);
                break;

            // --- CASE 5: YÊU CẦU HOÀN TRẢ (Buyer) ---
            case RETURN_REQUESTED:
                if (!order.getBuyer().getUsername().equals(username)) throw new RuntimeException("Chỉ người mua được yêu cầu hoàn trả");
                if (current != OrderStatus.DELIVERED) throw new RuntimeException("Phải nhận hàng rồi mới được yêu cầu hoàn trả");
                break;

            // --- CASE 6: XÁC NHẬN ĐÃ HOÀN TRẢ (Seller) ---
            case RETURNED:
                if (!order.getSeller().getUsername().equals(username)) throw new RuntimeException("Chỉ người bán được xác nhận đã nhận hàng hoàn");
                if (current != OrderStatus.RETURN_REQUESTED) throw new RuntimeException("Đơn hàng chưa có yêu cầu hoàn trả");

                // Hoàn tiền cho người mua
                User buyerRefund = order.getBuyer();
                buyerRefund.setBalance(buyerRefund.getBalance() + order.getFinalAmount());
                userRepository.save(buyerRefund);

                // Hoàn lại kho hàng
                restoreInventory(order);
                break;

            default:
                throw new RuntimeException("Trạng thái không hợp lệ");
        }

        order.setStatus(newStatus);
        orderRepository.save(order);
    }

    // Hàm phụ: Hoàn lại kho hàng
    private void restoreInventory(ShopOrder order) {
        for (OrderItem item : order.getItems()) {
            Product p = item.getProduct();
            p.setQuantity(p.getQuantity() + item.getQuantity());
            productRepository.save(p);
        }
    }

    // --- ADMIN: Lấy tất cả đơn hàng ---
    public List<ShopOrder> getAllOrdersAdmin() {
        return orderRepository.findAll(); // Hoặc sort theo ngày mới nhất
    }

    // --- ADMIN: Cưỡng chế cập nhật trạng thái (Giải quyết khiếu nại/Treo tiền) ---
    @Transactional
    public void forceUpdateStatus(Long orderId, OrderStatus newStatus) {
        ShopOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        // Logic xử lý tiền khi Admin can thiệp
        // Nếu chuyển sang COMPLETED -> Cộng tiền cho Seller (nếu chưa cộng)
        if (newStatus == OrderStatus.COMPLETED && order.getStatus() != OrderStatus.COMPLETED) {
            User seller = order.getSeller();
            seller.setBalance(seller.getBalance() + order.getFinalAmount());
            userRepository.save(seller);
            order.setCompletedDate(LocalDateTime.now());
        }
        // Nếu chuyển sang CANCELLED/RETURNED -> Hoàn tiền cho Buyer (nếu chưa hoàn)
        else if ((newStatus == OrderStatus.CANCELLED || newStatus == OrderStatus.RETURNED)
                && order.getStatus() != OrderStatus.CANCELLED && order.getStatus() != OrderStatus.RETURNED) {
            User buyer = order.getBuyer();
            buyer.setBalance(buyer.getBalance() + order.getFinalAmount());
            userRepository.save(buyer);

            // Hoàn tồn kho
            for (OrderItem item : order.getItems()) {
                Product p = item.getProduct();
                p.setQuantity(p.getQuantity() + item.getQuantity());
                productRepository.save(p);
            }
        }

        order.setStatus(newStatus);
        orderRepository.save(order);
    }

    // Trong ShopOrderService.java
    public List<ShopOrder> getOrdersBySeller(String username) {
        return orderRepository.findBySellerUsername(username);
    }

    public List<ShopOrder> getMyOrders(String username) {
        // Lấy đơn mua
        List<ShopOrder> buyOrders = orderRepository.findByBuyerUsername(username);
        // Lấy đơn bán
        List<ShopOrder> sellOrders = orderRepository.findBySellerUsername(username);

        // Gộp lại
        buyOrders.addAll(sellOrders);

        // Sắp xếp mới nhất lên đầu
        buyOrders.sort((a, b) -> b.getOrderDate().compareTo(a.getOrderDate()));

        return buyOrders;
    }


}