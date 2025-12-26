package com.mosoftvn.chatbox.Controller;

import com.mosoftvn.chatbox.DTO.PaymentDTO;
import com.mosoftvn.chatbox.DTO.VoucherDTO; // Đảm bảo bạn đã có class này hoặc dùng Map<String, Object> tạm
import com.mosoftvn.chatbox.Entity.*;
import com.mosoftvn.chatbox.Repository.*;
import com.mosoftvn.chatbox.Service.ProductService;
import com.mosoftvn.chatbox.Service.ShopOrderService;
import com.mosoftvn.chatbox.Service.VoucherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/market")
public class AdminMarketController {

    @Autowired
    private ProductService productService;

    @Autowired
    private VoucherService voucherService;

    @Autowired
    private ShopOrderService shopOrderService;

    @Autowired private UserRepository userRepository;
    @Autowired private ShopOrderRepository orderRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private ProductRepository productRepository;

    // --- 1. DUYỆT BÀI (PENDING) ---
    @GetMapping("/products/pending")
    public ResponseEntity<?> getPendingProducts() {
        // Gọi hàm service lấy các SP trạng thái PENDING
        return ResponseEntity.ok(productService.getAllPending());
    }

    @PutMapping("/products/{id}/approve")
    public ResponseEntity<?> approveProduct(@PathVariable Long id, @RequestParam boolean approved) {
        productService.approveProduct(id, approved);
        return ResponseEntity.ok(approved ? "Đã duyệt thành công!" : "Đã từ chối sản phẩm!");
    }

    // --- 2. QUẢN LÝ TẤT CẢ (ALL PRODUCTS) ---
    // Đây là hàm bạn đang thiếu khiến Admin không hiện gì ở Tab 2
    @GetMapping("/products/all")
    public ResponseEntity<?> getAllProductsManagement() {
        // Bạn cần thêm hàm findAll() hoặc getAll() trong ProductService nếu chưa có
        // Ở đây tôi gọi trực tiếp Repository thông qua Service hoặc bạn thêm hàm vào Service
        return ResponseEntity.ok(productService.getAllProductsAdmin());
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok("Đã xóa sản phẩm vĩnh viễn!");
    }

    // 4. Quản lý Đơn hàng (Xem tất cả)
    @GetMapping("/orders")
    public ResponseEntity<List<ShopOrder>> getAllOrders() {
        return ResponseEntity.ok(shopOrderService.getAllOrdersAdmin());
    }

    // 5. Admin can thiệp trạng thái đơn (Gỡ treo tiền)
    @PutMapping("/orders/{id}/status")
    public ResponseEntity<?> adminUpdateStatus(@PathVariable Long id, @RequestParam OrderStatus status) {
        shopOrderService.forceUpdateStatus(id, status);
        return ResponseEntity.ok("Admin đã cập nhật trạng thái đơn hàng!");
    }

    // --- 3. QUẢN LÝ VOUCHER ---
    @GetMapping("/vouchers")
    public ResponseEntity<?> getAllVouchers() {
        return ResponseEntity.ok(voucherService.getAllVouchers());
    }

    @PostMapping("/vouchers/create")
    public ResponseEntity<?> createVoucher(@RequestBody VoucherDTO dto) {
        return ResponseEntity.ok(voucherService.createManualVoucher(dto));
    }

    // --- API 1: THỐNG KÊ CƠ BẢN (CARD) ---
    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalProducts", productRepository.count());
        stats.put("totalOrders", orderRepository.count());
        stats.put("totalRevenue", transactionRepository.sumSystemTotalDeposit());
        return ResponseEntity.ok(stats);
    }

    // --- API 2: BIỂU ĐỒ DOANH THU THEO THÁNG ---
    @GetMapping("/dashboard/chart")
    public ResponseEntity<?> getRevenueChart(@RequestParam(required = false) Integer year) {
        try {
            // 1. Xác định năm cần xem (Nếu không gửi lên thì lấy năm hiện tại)
            int targetYear = (year != null) ? year : LocalDateTime.now().getYear();

            // 2. Lấy dữ liệu thô (Nên lấy hết rồi lọc Java cho an toàn, tránh lỗi SQL khác hệ quản trị)
            List<Transaction> transactions = transactionRepository.findByStatusAndTypeOrderByCreatedAtAsc(
                    TransactionStatus.SUCCESS, TransactionType.DEPOSIT);

            // 3. Khởi tạo Map dữ liệu cho 12 tháng của năm đó (Mặc định 0đ)
            // Dùng TreeMap để tự sắp xếp theo key "01/2024", "02/2024"...
            Map<String, Double> monthlyMap = new TreeMap<>();
            for (int i = 1; i <= 12; i++) {
                String key = String.format("%02d/%d", i, targetYear);
                monthlyMap.put(key, 0.0);
            }

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/yyyy");

            // 4. Lọc và cộng dồn tiền
            for (Transaction t : transactions) {
                if (t.getCreatedAt() != null && t.getCreatedAt().getYear() == targetYear) {
                    String monthKey = t.getCreatedAt().format(formatter);
                    // Chỉ cộng nếu tháng đó nằm trong năm target (Map đã init sẵn rồi)
                    if (monthlyMap.containsKey(monthKey)) {
                        monthlyMap.put(monthKey, monthlyMap.get(monthKey) + t.getAmountVnd());
                    }
                }
            }

            // 5. Chuyển đổi sang List để trả về
            List<PaymentDTO.MonthlyStat> chartData = new ArrayList<>();
            for (Map.Entry<String, Double> entry : monthlyMap.entrySet()) {
                chartData.add(PaymentDTO.MonthlyStat.builder()
                        .month(entry.getKey())
                        .totalAmount(entry.getValue())
                        .build());
            }

            return ResponseEntity.ok(chartData);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi Chart: " + e.getMessage());
        }
    }

    // --- API 3: DỮ LIỆU NÂNG CAO & BIỂU ĐỒ TRẠNG THÁI ---
    @GetMapping("/dashboard/advanced")
    public ResponseEntity<?> getAdvancedDashboard() {
        Map<String, Object> data = new HashMap<>();
        try {
            // A. TOP ĐẠI GIA (Dùng hàm có sẵn trong Repo)
            Pageable topFive = PageRequest.of(0, 5);
            List<Object[]> topRows = transactionRepository.findTopDepositors(topFive);
            data.put("topUsers", getMaps(topRows));

            // B. PHƯƠNG THỨC THANH TOÁN (Pie Chart 1)
            List<Object[]> methodRows = transactionRepository.countByPaymentMethod();
            List<Map<String, Object>> methodList = new ArrayList<>();
            for (Object[] row : methodRows) {
                Map<String, Object> m = new HashMap<>();
                m.put("name", row[0] != null ? row[0].toString() : "Khác");
                m.put("value", row[1]);
                methodList.add(m);
            }
            data.put("paymentMethods", methodList);

            // C. TRẠNG THÁI GIAO DỊCH TRONG NĂM (Pie Chart 2 - Mới)
            // Lấy từ đầu năm nay
            LocalDateTime startOfYear = LocalDateTime.now().withDayOfYear(1).withHour(0).withMinute(0);
            List<Transaction> yearTrans = transactionRepository.findByCreatedAtAfter(startOfYear);

            int success = 0, failed = 0, pending = 0;
            for (Transaction t : yearTrans) {
                // Chỉ tính giao dịch NẠP
                if (t.getType() == TransactionType.DEPOSIT) {
                    if (t.getStatus() == TransactionStatus.SUCCESS) success++;
                    else if (t.getStatus() == TransactionStatus.FAILED) failed++;
                    else pending++;
                }
            }

            List<Map<String, Object>> statusList = new ArrayList<>();
            // Luôn thêm đủ 3 trạng thái để biểu đồ có màu cố định
            statusList.add(Map.of("name", "Thành công", "value", success));
            statusList.add(Map.of("name", "Thất bại", "value", failed));
            statusList.add(Map.of("name", "Đang treo", "value", pending));

            data.put("transactionStatus", statusList);

            // D. DOANH THU 7 NGÀY GẦN NHẤT
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(6).withHour(0).withMinute(0);

            // Lọc lại từ list yearTrans để đỡ query DB lần nữa
            List<Transaction> recentTrans = yearTrans.stream()
                    .filter(t -> t.getCreatedAt().isAfter(sevenDaysAgo)
                            && t.getStatus() == TransactionStatus.SUCCESS
                            && t.getType() == TransactionType.DEPOSIT)
                    .collect(Collectors.toList());

            Map<String, Double> dailyMap = new LinkedHashMap<>();
            DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("dd/MM");
            // Init map 0đ cho đủ 7 ngày
            for (int i = 0; i < 7; i++) {
                dailyMap.put(sevenDaysAgo.plusDays(i).format(dayFormatter), 0.0);
            }
            // Fill data
            for (Transaction t : recentTrans) {
                String dayKey = t.getCreatedAt().format(dayFormatter);
                if (dailyMap.containsKey(dayKey)) {
                    dailyMap.put(dayKey, dailyMap.get(dayKey) + t.getAmountVnd());
                }
            }
            List<Map<String, Object>> dailyList = new ArrayList<>();
            dailyMap.forEach((k, v) -> dailyList.add(Map.of("day", k, "total", v)));
            data.put("dailyRevenue", dailyList);

            return ResponseEntity.ok(data);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi Advanced: " + e.getMessage());
        }
    }

    // Hàm Helper map Object[] sang Map
    private static List<Map<String, Object>> getMaps(List<Object[]> topRows) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Object[] row : topRows) {
            User u = (User) row[0];
            Double total = (Double) row[1];
            Map<String, Object> map = new HashMap<>();
            map.put("username", u.getUsername());
            map.put("fullName", u.getFullName() != null ? u.getFullName() : u.getUsername());
            map.put("avatar", u.getAvatar());
            map.put("total", total);
            list.add(map);
        }
        return list;
    }

    // LẤY DANH SÁCH GIAO DỊCH THEO NĂM (CHO XUẤT PDF) ---
    @GetMapping("/transactions/export")
    public ResponseEntity<?> getTransactionsForExport(@RequestParam(required = false) Integer year) {
        try {
            int targetYear = (year != null) ? year : LocalDateTime.now().getYear();
            LocalDateTime start = LocalDateTime.of(targetYear, 1, 1, 0, 0);
            LocalDateTime end = LocalDateTime.of(targetYear, 12, 31, 23, 59, 59);

            // Gọi hàm vừa thêm ở Repository
            List<Transaction> list = transactionRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);

            // Map sang DTO để trả về Frontend
            List<PaymentDTO.TransactionResponse> responseList = list.stream().map(t ->
                    PaymentDTO.TransactionResponse.builder()
                            .id(t.getId())
                            .transactionCode(t.getTransactionCode())
                            .amountVnd(t.getAmountVnd())
                            .type(t.getType().name())
                            .status(t.getStatus().name())
                            .createdAt(t.getCreatedAt())
                            .build() // Chỉ cần các trường này cho báo cáo
            ).collect(Collectors.toList());

            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi lấy dữ liệu: " + e.getMessage());
        }
    }
}