# Hướng dẫn cài đặt - Hệ thống quét văn bản VPDT tự động

## Tổng quan

Hệ thống sẽ:
- Tự động chạy khi bật máy tính
- Quét vpdt.dongthap.gov.vn mỗi 1 giờ
- Gửi thông báo Telegram ngay khi phát hiện văn bản mới
- Hoàn toàn chạy ngầm, không hiện cửa sổ

---

## Yêu cầu máy tính

- Windows 10 hoặc Windows 11
- Kết nối Internet ổn định
- RAM tối thiểu: 4GB (khuyến nghị 8GB)

---

## Bước 1: Chuẩn bị thông tin cần thiết

Trước khi cài, hãy chuẩn bị sẵn 4 thông tin:

| Thông tin | Cách lấy |
|-----------|----------|
| Tên đăng nhập VPDT | Số CCCD hoặc tài khoản đăng nhập vpdt.dongthap.gov.vn |
| Mật khẩu VPDT | Mật khẩu đang dùng đăng nhập VPDT |
| TELEGRAM_BOT_TOKEN | Chat với @BotFather trên Telegram → /newbot → lấy token |
| TELEGRAM_CHAT_ID | Chat với @userinfobot trên Telegram → nó trả về ID của bạn |

---

## Bước 2: Cài đặt Node.js (nếu chưa có)

1. Mở trình duyệt, vào: **https://nodejs.org**
2. Bấm nút **LTS** (phiên bản ổn định) để tải về
3. Chạy file `.msi` vừa tải, cài đặt với mọi tùy chọn mặc định
4. Khởi động lại máy tính sau khi cài xong

**Kiểm tra:** Mở PowerShell, gõ `node --version` → phải hiện số phiên bản (ví dụ: v22.0.0)

---

## Bước 3: Copy thư mục vào máy đích

Copy toàn bộ thư mục **vanban-bot** vào máy cần cài, ví dụ vào `C:\vanban-bot\`

Các file quan trọng cần có:
```
vanban-bot/
├── SETUP_TU_DONG.bat        ← File cài đặt chính
├── run-check.bat            ← Script chạy quet
├── run-check-hidden.vbs     ← Chạy ngầm không hiện cửa sổ
├── cloud-check-vpdt.js      ← Script kiểm tra VPDT
├── telegram-notify.js       ← Script gửi Telegram
├── package.json             ← Danh sách thư viện
└── state/
    └── known-vanban.json    ← Lưu trạng thái (văn bản đã biết)
```

---

## Bước 4: Chạy file cài đặt

1. Mở thư mục `vanban-bot`
2. **Click chuột PHẢI** vào `SETUP_TU_DONG.bat`
3. Chọn **"Run as administrator"**
4. Làm theo hướng dẫn trên màn hình:

### Quá trình cài đặt tự động:
- **Bước 1/4**: Kiểm tra Node.js → nếu chưa có, sẽ mở trang tải về
- **Bước 2/4**: Tải thư viện npm (khoảng 1-2 phút)
- **Bước 3/4**: Tải trình duyệt Playwright Chromium (khoảng 3-5 phút)
- **Bước 4/4**: Cấu hình tài khoản → Notepad sẽ mở ra

### Khi Notepad mở:
Sửa 4 dòng này với thông tin thực của bạn:
```
VPDT_USERNAME=so_cccd_hoac_tai_khoan
VPDT_PASSWORD=mat_khau_vpdt
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
TELEGRAM_CHAT_ID=123456789
```
Lưu lại bằng **Ctrl + S** rồi đóng Notepad.

---

## Bước 5: Kiểm tra sau cài đặt

Khi cài xong, màn hình hỏi "Chạy thử ngay bây giờ? (Y)":
- Nhấn **Y** và Enter
- Đợi khoảng 60 giây
- Kiểm tra file log tại `vanban-bot\logs\vpdt-check.log`
- Kiểm tra Telegram có nhận được tin nhắn thử không

### Log bình thường trông như thế này:
```
[29/05/2026 08:30:01] === BAT DAU QUET VPDT ===
Dang dang nhap vpdt.dongthap.gov.vn ...
Dang quet danh sach van ban den ...
Phat hien 15 dong van ban trong danh sach.
Khong co van ban moi.
[29/05/2026 08:31:45] === KET THUC QUET ===
```

### Khi có văn bản mới, log sẽ có:
```
Co 2 van ban moi. Dang gui Telegram ...
   ✅ Đã gửi thông báo Telegram
```

---

## Quản lý Task Scheduler

Để xem/quản lý 2 tasks đã cài:
1. Nhấn `Win + R` → gõ `taskschd.msc` → Enter
2. Tìm trong danh sách:
   - **VPDT-VanBan-KhoiDong**: chạy 1 lần khi đăng nhập Windows
   - **VPDT-VanBan-MoiGio**: chạy mỗi 1 giờ

### Tạm dừng:
Click phải vào task → **Disable**

### Bật lại:
Click phải vào task → **Enable**

### Gỡ cài đặt hoàn toàn:
Mở PowerShell (Admin) và chạy:
```powershell
schtasks /delete /tn "VPDT-VanBan-KhoiDong" /f
schtasks /delete /tn "VPDT-VanBan-MoiGio" /f
```

---

## Xử lý sự cố thường gặp

### Log báo lỗi đăng nhập
- Kiểm tra lại VPDT_USERNAME và VPDT_PASSWORD trong file `.env`
- Thử đăng nhập thủ công tại vpdt.dongthap.gov.vn

### Không nhận được Telegram
- Kiểm tra TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID trong file `.env`
- Đảm bảo bạn đã chat ít nhất 1 tin nhắn với bot trước
- Thử gửi tin nhắn test: mở PowerShell, chạy `node vanban-bot\cloud-check-vpdt.js`

### Log trống hoặc không tạo
- Đảm bảo thư mục `logs\` tồn tại trong vanban-bot
- Kiểm tra quyền ghi file vào thư mục đó

### Task không chạy sau khi bật máy
- Mở Task Scheduler, kiểm tra task có bị Disabled không
- Chạy lại `SETUP_TU_DONG.bat` với quyền Admin để tạo lại tasks

---

## Cập nhật mật khẩu VPDT

Khi đổi mật khẩu VPDT, chỉ cần:
1. Mở file `.env` trong thư mục `vanban-bot`
2. Sửa dòng `VPDT_PASSWORD=...`
3. Lưu lại

Không cần cài đặt lại, lần quét tiếp theo sẽ dùng mật khẩu mới.
