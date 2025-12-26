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
    @Autowired private ShopOrderRepository shopOrderRepository;
    @Autowired private ShopRepository shopRepository;

    // 🟢 THÊM: Inject VoucherService để dùng hàm applyVoucher chuẩn
    @Autowired private VoucherService voucherService;

    // 1. TẠO ĐƠN HÀNG
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

        // 🟢 SỬA LOGIC VOUCHER: Gọi qua VoucherService để xử lý đồng bộ
        if (req.getVoucherCode() != null && !req.getVoucherCode().isEmpty()) {
            try {
                // Hàm này sẽ kiểm tra hạn, chủ sở hữu và tự động trừ lượt dùng
                Voucher v = voucherService.applyVoucher(req.getVoucherCode(), buyerUsername);

                // Tính giảm giá (Ưu tiên % trước, nếu không có thì dùng tiền mặt)
                if (v.getDiscountPercent() != null && v.getDiscountPercent() > 0) {
                    discount = total * v.getDiscountPercent();
                } else if (v.getDiscountAmount() != null) {
                    discount = v.getDiscountAmount();
                }
            } catch (RuntimeException e) {
                // Bắt lỗi từ VoucherService (ví dụ: hết hạn, không phải của bạn) và ném ra cho Frontend
                throw new RuntimeException("Lỗi Voucher: " + e.getMessage());
            }
        }

        double finalAmount = total - discount;
        if (finalAmount < 0) finalAmount = 0; // Đảm bảo không âm

        // TRỪ TIỀN NGƯỜI MUA (Tiền tạm giữ ở hệ thống)
        if (buyer.getBalance() < finalAmount) throw new RuntimeException("Số dư không đủ! Vui lòng nạp thêm tiền.");
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
        order.setShippingAddress(req.getAddress());

        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(req.getQuantity());
        item.setPriceAtPurchase(product.getPrice());
        item.setOrder(order);

        order.setItems(List.of(item));

        return orderRepository.save(order);
    }

    // 2. CẬP NHẬT TRẠNG THÁI (Giữ nguyên logic đã sửa của bạn)
    @Transactional
    public void updateStatus(Long orderId, OrderStatus newStatus, String username) {
        ShopOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        OrderStatus current = order.getStatus();

        switch (newStatus) {
            // CASE 1: NGƯỜI BÁN GỬI HÀNG
            case SHIPPED:
                if (!order.getSeller().getUsername().equals(username))
                    throw new RuntimeException("Chỉ người bán được xác nhận gửi hàng");
                if (current != OrderStatus.PREPARING)
                    throw new RuntimeException("Đơn hàng phải ở trạng thái Chuẩn bị mới được gửi");
                break;

            // CASE 2: KHÁCH ĐÃ NHẬN HÀNG
            case DELIVERED:
                if (!order.getBuyer().getUsername().equals(username))
                    throw new RuntimeException("Chỉ người mua mới được xác nhận đã nhận hàng");
                if (current != OrderStatus.SHIPPED)
                    throw new RuntimeException("Đơn chưa gửi thì sao đã nhận được?");
                break;

            // CASE 3: HOÀN TẤT ĐƠN HÀNG (Cộng tiền Seller)
            case COMPLETED:
                if (!order.getSeller().getUsername().equals(username))
                    throw new RuntimeException("Chỉ Shop mới có quyền duyệt hoàn tất đơn hàng");
                if (current != OrderStatus.DELIVERED)
                    throw new RuntimeException("Khách chưa xác nhận nhận hàng, không thể hoàn tất!");

                // 1. Cộng Sold Product
                for (OrderItem item : order.getItems()) {
                    Product p = item.getProduct();
                    int currentSold = p.getSold() == null ? 0 : p.getSold();
                    p.setSold(currentSold + item.getQuantity());
                    productRepository.save(p);
                }

                // 2. Cộng Sold Shop
                Shop shop = order.getShop();
                Integer totalShopSold = productRepository.sumSoldByShop(shop.getId());
                shop.setTotalSold(totalShopSold != null ? totalShopSold : 0);
                shopRepository.save(shop);

                // 3. Cộng tiền Seller
                User seller = order.getSeller();
                seller.setBalance(seller.getBalance() + order.getFinalAmount());
                userRepository.save(seller);

                order.setCompletedDate(LocalDateTime.now());
                break;

            // CASE 4: HỦY ĐƠN (Hoàn tiền Buyer)
            case CANCELLED:
                boolean isBuyer = order.getBuyer().getUsername().equals(username);
                boolean isSeller = order.getSeller().getUsername().equals(username);

                if (!isBuyer && !isSeller) throw new RuntimeException("Bạn không có quyền hủy đơn này");
                if (current != OrderStatus.PREPARING) throw new RuntimeException("Hàng đã gửi đi, không thể hủy!");

                // Hoàn tiền Buyer
                User buyer = order.getBuyer();
                buyer.setBalance(buyer.getBalance() + order.getFinalAmount());
                userRepository.save(buyer);

                // Hoàn kho
                restoreInventory(order);
                break;

            // CASE 5: YÊU CẦU HOÀN TRẢ
            case RETURN_REQUESTED:
                if (!order.getBuyer().getUsername().equals(username)) throw new RuntimeException("Chỉ người mua được yêu cầu hoàn trả");
                if (current != OrderStatus.DELIVERED) throw new RuntimeException("Phải nhận hàng rồi mới được yêu cầu hoàn trả");
                break;

            // CASE 6: XÁC NHẬN ĐÃ HOÀN TRẢ
            case RETURNED:
                if (!order.getSeller().getUsername().equals(username)) throw new RuntimeException("Chỉ người bán được xác nhận đã nhận hàng hoàn");
                if (current != OrderStatus.RETURN_REQUESTED) throw new RuntimeException("Đơn hàng chưa có yêu cầu hoàn trả");

                // Hoàn tiền Buyer
                User buyerRefund = order.getBuyer();
                buyerRefund.setBalance(buyerRefund.getBalance() + order.getFinalAmount());
                userRepository.save(buyerRefund);

                // Hoàn kho
                restoreInventory(order);
                break;

            default:
                throw new RuntimeException("Trạng thái không hợp lệ");
        }

        order.setStatus(newStatus);
        orderRepository.save(order);
    }

    private void restoreInventory(ShopOrder order) {
        for (OrderItem item : order.getItems()) {
            Product p = item.getProduct();
            p.setQuantity(p.getQuantity() + item.getQuantity());
            productRepository.save(p);
        }
    }

    // ADMIN API
    public List<ShopOrder> getAllOrdersAdmin() {
        return orderRepository.findAll();
    }

    @Transactional
    public void forceUpdateStatus(Long orderId, OrderStatus newStatus) {
        ShopOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        if (newStatus == OrderStatus.COMPLETED && order.getStatus() != OrderStatus.COMPLETED) {
            User seller = order.getSeller();
            seller.setBalance(seller.getBalance() + order.getFinalAmount());
            userRepository.save(seller);
            order.setCompletedDate(LocalDateTime.now());
        }
        else if ((newStatus == OrderStatus.CANCELLED || newStatus == OrderStatus.RETURNED)
                && order.getStatus() != OrderStatus.CANCELLED && order.getStatus() != OrderStatus.RETURNED) {
            User buyer = order.getBuyer();
            buyer.setBalance(buyer.getBalance() + order.getFinalAmount());
            userRepository.save(buyer);
            restoreInventory(order);
        }

        order.setStatus(newStatus);
        orderRepository.save(order);
    }

    public List<ShopOrder> getOrdersBySeller(String username) {
        return orderRepository.findBySellerUsername(username);
    }

    //lay mua k lay ban
    public List<ShopOrder> getMyOrders(String username) {
        // Chỉ tìm đơn hàng mà user này là người mua (Buyer)
        List<ShopOrder> buyOrders = orderRepository.findByBuyerUsername(username);

        // Sắp xếp đơn mới nhất lên đầu
        buyOrders.sort((a, b) -> b.getOrderDate().compareTo(a.getOrderDate()));

        return buyOrders;
    }
}