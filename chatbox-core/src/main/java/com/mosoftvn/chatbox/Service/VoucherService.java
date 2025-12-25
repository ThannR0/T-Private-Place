package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.VoucherDTO;
import com.mosoftvn.chatbox.Entity.Notification;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Entity.Voucher;
import com.mosoftvn.chatbox.Repository.NotificationRepository;
import com.mosoftvn.chatbox.Repository.TransactionRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import com.mosoftvn.chatbox.Repository.VoucherRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
public class VoucherService {
    @Autowired private UserRepository userRepository;
    @Autowired private VoucherRepository voucherRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // CẤU HÌNH MỐC VIP (VND)
    private static final double MIN_TITANIUM = 1_000_000_000;
    private static final double MIN_DIAMOND  = 250_000_000;
    private static final double MIN_PLATINUM = 80_000_000;
    private static final double MIN_GOLD     = 15_000_000;
    private static final double MIN_SILVER   = 5_000_000;
    private static final double MIN_BRONZE   = 500_000;

    // 1. SCHEDULER: CHẠY LÚC 00:00 NGÀY 1 HÀNG THÁNG
    @Scheduled(cron = "0 0 0 1 * ?")
    @Transactional
    public void distributeMonthlyVouchers() {
        System.out.println("--- BẮT ĐẦU PHÁT VOUCHER HÀNG THÁNG ---");
        List<User> users = userRepository.findAll();
        int month = LocalDateTime.now().getMonthValue();
        int year = LocalDateTime.now().getYear();

        for (User user : users) {
            // Lấy tổng nạp (Ưu tiên lấy từ User entity cho nhanh, hoặc tính lại từ Transaction nếu cần chính xác tuyệt đối)
            Double total = user.getTotalDeposited() != null ? user.getTotalDeposited() : 0.0;

            if (total < MIN_BRONZE) continue; // Chưa đạt mốc thì bỏ qua

            double discount = 0.0;
            String levelCode = "";

            if (total >= MIN_TITANIUM) { discount = 0.35; levelCode = "TITANIUM"; }
            else if (total >= MIN_DIAMOND) { discount = 0.25; levelCode = "DIAMOND"; }
            else if (total >= MIN_PLATINUM) { discount = 0.15; levelCode = "PLATINUM"; }
            else if (total >= MIN_GOLD) { discount = 0.10; levelCode = "GOLD"; }
            else if (total >= MIN_SILVER) { discount = 0.05; levelCode = "SILVER"; }
            else if (total >= MIN_BRONZE) { discount = 0.03; levelCode = "BRONZE"; }

            if (discount > 0) {
                createMonthlyVoucherForUser(user, levelCode, discount, month, year);
            }
        }
        System.out.println("--- KẾT THÚC PHÁT VOUCHER ---");
    }

    private void createMonthlyVoucherForUser(User user, String level, Double discount, int month, int year) {
        Voucher v = new Voucher();
        // Mã code VD: MONTH_10_2023_GOLD_user123
        String code = String.format("MONTH_%d_%d_%s_%s", month, year, level, user.getUsername());

        // Kiểm tra xem đã nhận chưa (Tránh chạy lại bị trùng)
        if(voucherRepository.existsByCode(code)) return;

        v.setCode(code);
        v.setDescription("Đặc quyền thành viên " + level + " tháng " + month);
        v.setDiscountPercent(discount); // 0.03 -> 0.35
        v.setDiscountAmount(0.0);
        v.setMinOrderAmount(0.0);

        v.setOwner(user);
        v.setUsageLimit(1);
        v.setUsedCount(0);
        v.setIsActive(true);
        v.setUsed(false);

        // Lấy ngày cuối cùng của tháng hiện tại (tự động tính 28, 29, 30 hay 31)
        LocalDateTime endOfMonth = LocalDateTime.now()
                .with(java.time.temporal.TemporalAdjusters.lastDayOfMonth())
                .withHour(23).withMinute(59).withSecond(59);
        v.setExpiryDate(endOfMonth);

        voucherRepository.save(v);
    }

    // 2. LẤY DANH SÁCH VOUCHER CỦA TÔI (Cho API Frontend)
    public List<Voucher> getMyVouchers(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        // Lấy voucher của user VÀ voucher chung (owner == null) mà còn hạn
        return voucherRepository.findAvailableVouchersForUser(user.getId(), LocalDateTime.now());
    }

    @Transactional
    public Voucher createManualVoucher(VoucherDTO dto) {
        Voucher v = new Voucher();
        v.setCode(dto.getCode() != null ? dto.getCode() : "ADMIN_" + System.currentTimeMillis());
        v.setDescription(dto.getDescription() != null ? dto.getDescription() : "Voucher từ Admin");
        v.setDiscountPercent(dto.getDiscountPercent());

        // Mặc định hạn 30 ngày nếu không chọn
        v.setExpiryDate(dto.getExpiryDate() != null ? dto.getExpiryDate() : LocalDateTime.now().plusDays(30));

        v.setUsageLimit(1);
        v.setUsedCount(0);
        v.setIsActive(true);
        v.setUsed(false);

        if (dto.getOwnerUsername() != null && !dto.getOwnerUsername().isEmpty()) {
            User u = userRepository.findByUsername(dto.getOwnerUsername()).orElse(null);
            if (u != null) {
                v.setOwner(u);
                voucherRepository.save(v);

                // 🟢 GỬI THÔNG BÁO CHO USER
                sendVoucherNotification(u, v);
            }
        } else {
            v.setOwner(null); // Voucher chung
            voucherRepository.save(v);
        }

        return v;
    }

    // Hàm tạo Voucher thăng hạng (Level Up / Sync)
    @Transactional
    public void createLevelUpVoucher(User user, String levelName, Double discountPercent) {
        Voucher voucher = new Voucher();
        voucher.setCode("VIP_" + levelName + "_" + user.getUsername() + "_" + System.currentTimeMillis());
        voucher.setDescription("Thưởng thăng hạng " + levelName + " dành riêng cho " + user.getUsername());
        voucher.setDiscountPercent(discountPercent);
        voucher.setDiscountAmount(0.0);
        voucher.setMinOrderAmount(0.0);
        voucher.setExpiryDate(LocalDateTime.now().plusDays(30));
        voucher.setUsageLimit(1);
        voucher.setUsedCount(0);
        voucher.setIsActive(true);
        voucher.setUsed(false);
        voucher.setOwner(user);

        voucherRepository.save(voucher);

        // 🟢 GỬI THÔNG BÁO CHO USER
        sendVoucherNotification(user, voucher);
    }

    // 🟢 HÀM PHỤ TRỢ: GỬI THÔNG BÁO & SOCKET
    private void sendVoucherNotification(User user, Voucher v) {
        try {
            // 1. Lưu thông báo vào Database (để hiện trong danh sách cái chuông)
            Notification noti = new Notification();
            noti.setUser(user);
            String content = "🎁 Bạn nhận được Voucher mới: " + v.getCode() + " (Giảm " + (String.format("%.0f", v.getDiscountPercent() * 100)) + "%)";
            noti.setContent(content);
            noti.setRead(false);
            noti.setCreatedAt(LocalDateTime.now());
            // noti.setType("VOUCHER"); // Nếu entity Notification của bạn có trường type thì bỏ comment dòng này

            Notification savedNoti = notificationRepository.save(noti);

            // 2. Bắn Socket Realtime (để hiện popup ngay lập tức)
            // Kênh này khớp với client.subscribe trong ChatContext.jsx
            messagingTemplate.convertAndSendToUser(
                    user.getUsername(),
                    "/queue/notifications",
                    savedNoti
            );

            System.out.println("Đã gửi noti voucher cho " + user.getUsername());

        } catch (Exception e) {
            System.err.println("Lỗi gửi thông báo voucher: " + e.getMessage());
        }
    }
    public List<Voucher> getAllVouchers() {
        return voucherRepository.findAll();
    }

    // 3. HÀM QUÉT VÀ BÙ VOUCHER (ĐÃ THÊM LOG DEBUG)
    public String syncVouchersForExistingUsers() {
        System.out.println(">>> BẮT ĐẦU QUÉT SYNC VOUCHER...");
        List<User> users = userRepository.findAll();
        int countCreated = 0;

        // Cấu hình mốc (VND)
        double BRONZE = 500_000;
        double SILVER = 5_000_000;
        double GOLD = 15_000_000;
        double PLATINUM = 80_000_000;
        double DIAMOND = 250_000_000;
        double TITANIUM = 1_000_000_000;

        for (User user : users) {
            Double total = user.getTotalDeposited() != null ? user.getTotalDeposited() : 0.0;

            // In ra để kiểm tra
            System.out.println("Checking User: " + user.getUsername() + " | Total: " + String.format("%.0f", total));

            // Logic: Đạt mốc nào thì kiểm tra và tặng mốc đó
            if (total >= BRONZE) if(checkAndCreateMissingVoucher(user, "BRONZE", 0.03)) countCreated++;
            if (total >= SILVER) if(checkAndCreateMissingVoucher(user, "SILVER", 0.05)) countCreated++;
            if (total >= GOLD) if(checkAndCreateMissingVoucher(user, "GOLD", 0.10)) countCreated++;
            if (total >= PLATINUM) if(checkAndCreateMissingVoucher(user, "PLATINUM", 0.15)) countCreated++;
            if (total >= DIAMOND) if(checkAndCreateMissingVoucher(user, "DIAMOND", 0.25)) countCreated++;
            if (total >= TITANIUM) if(checkAndCreateMissingVoucher(user, "TITANIUM", 0.35)) countCreated++;
        }

        System.out.println(">>> KẾT THÚC SYNC. Đã tạo thêm: " + countCreated + " voucher.");
        return "Đã quét " + users.size() + " user. Tạo mới " + countCreated + " voucher.";
    }

    // Hàm phụ trợ: Trả về true nếu tạo mới, false nếu đã có
    private boolean checkAndCreateMissingVoucher(User user, String levelName, Double percent) {
        // Mã định danh để check trùng: VIP_LEVELNAME_USERNAME
        // Lưu ý: Phải khớp với prefix lúc tạo
        String codePrefix = "VIP_" + levelName + "_" + user.getUsername();

        boolean exists = voucherRepository.existsByCodeStartingWith(codePrefix);

        if (!exists) {
            System.out.println("   -> Tạo Voucher " + levelName + " cho " + user.getUsername());
            createLevelUpVoucher(user, levelName, percent);
            return true;
        } else {
            // System.out.println("   -> Đã có voucher " + levelName + ", bỏ qua.");
            return false;
        }
    }


    // 4. API CHO ADMIN: Lấy tất cả voucher (có phân trang/lọc nếu cần)
    public List<Voucher> getAllVouchersForAdmin() {
        // Có thể custom thêm sắp xếp giảm dần theo ngày tạo
        return voucherRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
    }

    // 🟢 1. HÀM CẬP NHẬT (Update) CHO ADMIN
    @Transactional
    public Voucher updateVoucher(Long id, VoucherDTO dto) {
        Voucher v = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voucher không tồn tại"));

        // Update các trường cho phép sửa
        if (dto.getDiscountPercent() != null) v.setDiscountPercent(dto.getDiscountPercent());
        if (dto.getExpiryDate() != null) v.setExpiryDate(dto.getExpiryDate());
        if (dto.getDescription() != null) v.setDescription(dto.getDescription());

        // Nếu muốn cho sửa mã code (cần check trùng)
        if (dto.getCode() != null && !dto.getCode().equals(v.getCode())) {
            if(voucherRepository.existsByCode(dto.getCode())) throw new RuntimeException("Mã mới bị trùng");
            v.setCode(dto.getCode());
        }

        return voucherRepository.save(v);
    }

    // 🟢 2. HÀM XÓA VĨNH VIỄN CHO ADMIN
    @Transactional
    public void deleteVoucher(Long id) {
        if(!voucherRepository.existsById(id)) throw new RuntimeException("Không tìm thấy voucher");
        voucherRepository.deleteById(id);
    }

    // 🟢 3. HÀM ẨN VOUCHER CHO USER (Soft Delete)
    @Transactional
    public void hideVoucher(Long id, String username) {
        Voucher v = voucherRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy"));

        // Chỉ chủ sở hữu mới được ẩn
        if (v.getOwner() != null && v.getOwner().getUsername().equals(username)) {
            v.setDeletedByUser(true);
            voucherRepository.save(v);
        } else {
            throw new RuntimeException("Bạn không sở hữu voucher này");
        }
    }


}