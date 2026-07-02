# QUY TRÌNH XỬ LÝ VĂN BẢN MỚI

Khi được yêu cầu xử lý văn bản mới, Cascade PHẢI thực hiện đúng quy trình:

1. Đăng nhập vào https://vpdt.dongthap.gov.vn
2. Vào tab "Chờ duyệt"
3. Lấy danh sách số hiệu tất cả văn bản trong tab
4. Đọc file logs/van_ban_den_2025_2026.json
5. Với MỖI số hiệu trong "Chờ duyệt":
   - Nếu ĐÃ CÓ trong JSON → bỏ qua
   - Nếu CHƯA CÓ → xử lý như văn bản mới:
     a. Click vào văn bản để mở trang chi tiết
     b. Lấy thông tin: trích yếu, ngày ký, cơ quan ban hành
     c. Tải TẤT CẢ file đính kèm
     d. Đặt tên file theo rule "dat-ten-file.rule"
     e. Lưu vào thư mục van-ban-den/
     f. Cập nhật metadata vào JSON
6. Kết thúc, báo cáo số lượng văn bản mới và file đã tải