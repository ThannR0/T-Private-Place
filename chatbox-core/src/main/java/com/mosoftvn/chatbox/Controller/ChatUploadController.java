//package com.mosoftvn.chatbox.Controller;
//
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//import org.springframework.web.multipart.MultipartFile;
//import java.io.IOException;
//import java.nio.file.*;
//import java.util.Map;
//import java.util.Objects;
//
//@RestController
//@RequestMapping("/api/chat")
//public class ChatUploadController {
//
//    private final String UPLOAD_DIR = "uploads/chat/"; // Thư mục riêng cho chat
//
//    @PostMapping("/upload")
//    public ResponseEntity<?> uploadChatFile(@RequestParam("file") MultipartFile file) {
//        try {
//            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
//            Path path = Paths.get(UPLOAD_DIR + fileName);
//            Files.createDirectories(path.getParent());
//            Files.write(path, file.getBytes());
//
//            String fileUrl = "http://localhost:8081/images/chat/" + fileName; // Đảm bảo WebConfig đã mở path này
//
//            return ResponseEntity.ok(Map.of(
//                    "url", fileUrl,
//                    "type", Objects.requireNonNull(file.getContentType()),
//                    "name", Objects.requireNonNull(file.getOriginalFilename())
//            ));
//        } catch (IOException e) {
//            return ResponseEntity.internalServerError().body("Upload failed");
//        }
//    }
//}