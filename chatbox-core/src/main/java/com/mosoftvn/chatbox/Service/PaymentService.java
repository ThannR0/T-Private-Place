package com.mosoftvn.chatbox.Service;

import com.mosoftvn.chatbox.DTO.PaymentDTO;
import com.mosoftvn.chatbox.Entity.Transaction;
import com.mosoftvn.chatbox.Entity.TransactionStatus;
import com.mosoftvn.chatbox.Entity.TransactionType;
import com.mosoftvn.chatbox.Entity.User;
import com.mosoftvn.chatbox.Repository.TransactionRepository;
import com.mosoftvn.chatbox.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    // 🟢 Inject SimpMessagingTemplate để bắn Socket
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // CẤU HÌNH NGÂN HÀNG CỦA BẠN (Dùng để tạo QR)
    // Tra cứu Bank ID tại: https://api.vietqr.io/v2/banks (Ví dụ: MBBank là 970422, Vietcombank là 970436...)
    // Hoặc dùng shortname: MB, VCB, ACB...
    @Value("${payment.vietqr.bankId}")
    private String bankId;

    @Value("${payment.vietqr.accountNo}")
    private String accountNo;

    @Value("${payment.vietqr.template}")
    private String template;

    // Tỷ giá cũng nên đưa ra cấu hình để sau này dễ sửa mà không cần build lại code
    @Value("${payment.exchange.rate}")
    private double exchangeRate;

    @Autowired private UserService userService;

    // 1. TẠO GIAO DỊCH NẠP/DONATE
    @Transactional
    public PaymentDTO.TransactionResponse createTransaction(String username, PaymentDTO.DepositRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Tính toán
        Double thanReceived = 0.0;
        TransactionType type = TransactionType.valueOf(req.getType());

        if (type == TransactionType.DEPOSIT) {
            thanReceived = req.getAmount() * exchangeRate;
        }

        // Tạo mã giao dịch duy nhất: "NAP" + UserID + TimeMillis
        // Ví dụ: NAP_1_1698223344
        String transCode = (type == TransactionType.DEPOSIT ? "NAP" : "DONATE") + "_" + user.getId() + "_" + System.currentTimeMillis();

        // Tạo Link VietQR
        // Format: https://img.vietqr.io/image/<BANK>-<ACC>-<TEMPLATE>.png?amount=<AMT>&addInfo=<CONTENT>
        String content = transCode; // Nội dung chuyển khoản CHÍNH LÀ mã giao dịch để dễ check
        String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-%s.png?amount=%d&addInfo=%s",
                bankId, accountNo, template, req.getAmount().longValue(), content);

        Transaction transaction = Transaction.builder()
                .user(user)
                .amountVnd(req.getAmount())
                .thanReceived(thanReceived)
                .type(type)
                .status(TransactionStatus.PENDING)
                .paymentMethod(req.getMethod())
                .transactionCode(transCode)
                .qrUrl(qrUrl)
                .build();

        Transaction saved = transactionRepository.save(transaction);
        return mapToDTO(saved);
    }

    // 2. XỬ LÝ KHI THANH TOÁN THÀNH CÔNG (Duyệt)
    // Hàm này sẽ được gọi bởi Admin hoặc Webhook tự động (nếu có tích hợp Casso/Sepay)
    @Transactional
    public void confirmTransaction(String transactionCode) {
        Transaction trans = transactionRepository.findByTransactionCode(transactionCode)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (trans.getStatus() == TransactionStatus.SUCCESS) {
            return; // Đã xử lý rồi
        }

        // Cập nhật trạng thái
        trans.setStatus(TransactionStatus.SUCCESS);
        trans.setCompletedAt(LocalDateTime.now());

        // Nếu là NẠP -> Cộng tiền ảo cho User
        if (trans.getType() == TransactionType.DEPOSIT) {
            User user = trans.getUser();
            Double currentBalance = user.getBalance() == null ? 0.0 : user.getBalance();
            user.setBalance(currentBalance + trans.getThanReceived());
            userRepository.save(user);
        }

        transactionRepository.save(trans);
    }

    // 3. LẤY LỊCH SỬ
    public List<PaymentDTO.TransactionResponse> getHistory(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // 4. THỐNG KÊ THEO THÁNG
    public List<PaymentDTO.MonthlyStat> getMonthlyStats(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        List<Object[]> stats = transactionRepository.getMonthlyStats(user.getId());

        return stats.stream().map(obj -> PaymentDTO.MonthlyStat.builder()
                .month((String) obj[0])
                .totalAmount((Double) obj[1])
                .build()).collect(Collectors.toList());
    }

    // ADMIN: Lấy tất cả giao dịch (để duyệt)
    public List<PaymentDTO.TransactionResponse> getAllTransactions() {
        return transactionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ADMIN: Từ chối giao dịch (Hủy)
    public void rejectTransaction(String transactionCode) {
        Transaction trans = transactionRepository.findByTransactionCode(transactionCode)
                .orElseThrow(() -> new RuntimeException("Not found"));
        if (trans.getStatus() == TransactionStatus.PENDING) {
            trans.setStatus(TransactionStatus.FAILED);
            transactionRepository.save(trans);
        }
    }

    // XỬ LÝ THANH TOÁN TỰ ĐỘNG (Được gọi bởi Webhook hoặc API test)
    @Transactional
    public void processPaymentSuccess(String transactionCode, Double realAmount) {
        // 1. Tìm giao dịch
        Transaction trans = transactionRepository.findByTransactionCode(transactionCode)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        // 2. Nếu đã thành công rồi thì thôi
        if (trans.getStatus() == TransactionStatus.SUCCESS) return;

        // 3. CẬP NHẬT TRẠNG THÁI NGAY LẬP TỨC (Không cần Admin duyệt)
        trans.setStatus(TransactionStatus.SUCCESS);
        trans.setUpdatedAt(LocalDateTime.now());

        // 4. Cộng tiền cho User
        User user = trans.getUser();


        Double oldBalance = user.getBalance() == null ? 0.0 : user.getBalance();
        Double oldTotalDeposited = user.getTotalDeposited() == null ? 0.0 : user.getTotalDeposited();

        // B. Cộng tiền:
        // - Balance (Số dư): Cộng bằng Coin (thanReceived)
        // - TotalDeposited (Tổng nạp): Cộng bằng VND (amountVnd)
        user.setBalance(oldBalance + trans.getThanReceived());
        Double newTotalDeposited = oldTotalDeposited + trans.getAmountVnd(); // Quan trọng: Phải cộng tổng nạp VND
        user.setTotalDeposited(newTotalDeposited);

        userRepository.save(user); // Lưu lại
        transactionRepository.save(trans);

        // C. GỌI HÀM KIỂM TRA LÊN CẤP VÀ BẮN PHÁO HOA
        // (Hàm này nằm bên UserService vừa được đổi thành public)
        try {
            userService.checkAndRewardLevelUp(user, oldTotalDeposited, newTotalDeposited);
        } catch (Exception e) {
            System.err.println("Lỗi khi check lên cấp: " + e.getMessage());
            e.printStackTrace();
        }

        userRepository.save(user);
        transactionRepository.save(trans);

        // 5. BẮN SOCKET: Báo cho Frontend người dùng (để chuyển màn hình)
        messagingTemplate.convertAndSendToUser(
                user.getUsername(),
                "/queue/payment",
                PaymentDTO.TransactionResponse.builder()
                        .transactionCode(transactionCode)
                        .status("SUCCESS")
                        .build()
        );

        // 6. BẮN SOCKET: Báo cập nhật số dư Header
        messagingTemplate.convertAndSendToUser(
                user.getUsername(),
                "/queue/updates",
                "UPDATE_BALANCE"
        );

        // 7. (Tùy chọn) BẮN SOCKET: Báo cho trang Admin reload (nếu Admin đang mở)
        messagingTemplate.convertAndSend("/topic/admin/payment-updates", "NEW_PAYMENT");
    }





    private PaymentDTO.TransactionResponse mapToDTO(Transaction t) {
        return PaymentDTO.TransactionResponse.builder()
                .id(t.getId())
                .transactionCode(t.getTransactionCode())
                .amountVnd(t.getAmountVnd())
                .thanReceived(t.getThanReceived())
                .type(t.getType().name())
                .status(t.getStatus().name())
                .qrUrl(t.getQrUrl())
                .createdAt(t.getCreatedAt())
                .build();
    }
}