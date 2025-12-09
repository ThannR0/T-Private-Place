package com.mosoftvn.chatbox.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendEmail(String to, String subject, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);

            mailSender.send(message);
            System.out.println("LOG: Đã gửi mail thành công tới " + to);
        } catch (Exception e) {
            System.err.println("Lỗi gửi mail: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendOtpEmail(String toEmail, String otpCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Mã xác thực Chatbox AI");
            message.setText("Chào bạn,\n\nMã OTP của bạn là: " + otpCode + "\n\nMã này sẽ hết hạn sau 5 phút.");

            mailSender.send(message);
            System.out.println("Mail sent successfully to " + toEmail);
        } catch (Exception e) {
            System.err.println("Error sending email: " + e.getMessage());
            // ném lỗi ra để Controller biết
        }
    }
}