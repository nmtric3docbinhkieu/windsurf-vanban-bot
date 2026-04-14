# Hướng Dẫn Chạy Tự Động (Không Cần Mở Windsurf)

## Phương án 1: Chạy khi khởi động Windows (Khuyên dùng)

### Bước 1: Chạy file setup
1. Mở folder `windsurf-vanban-bot/`
2. **Click chuột phải** vào `setup-auto-run.bat` → chọn **"Run as administrator"**
3. Script sẽ tự động tạo task chạy khi Windows khởi động

### Bước 2: Kiểm tra
- Mở Task Scheduler: nhấn `Win + R` → gõ `taskschd.msc` → Enter
- Tìm task tên **"VanBan-Crawler"**
- Kiểm tra log tại: `windsurf-vanban-bot/logs/auto-run.log`

### Bước 3: Test thủ công
- Chạy file `run-crawler.bat` để test ngay lập tức

---

## Phương án 2: Chạy theo lịch định kỳ (Task Scheduler)

Nếu bạn muốn crawler chạy **mỗi 30 phút** hoặc **mỗi giờ** thay vì chạy liên tục:

1. Mở Task Scheduler (`Win + R` → `taskschd.msc`)
2. Tìm task **"VanBan-Crawler"** → Click chuột phải → **Properties**
3. Tab **Triggers** → Edit
4. Chọn:
   - **Begin the task**: `On a schedule`
   - **Settings**: `Repeat task every` → chọn `30 minutes`
   - **for a duration of**: `Indefinitely`

---

## Phương án 3: Chạy liên tục 24/7 (Windows Service)

Dùng PM2 để chạy như service:

```bash
# Cài đặt PM2
cd windsurf-vanban-bot
npm install -g pm2

# Chạy với PM2
pm2 start crawl-download-fast.js --name "vanban-crawler"

# Lưu cấu hình để tự khởi động
pm2 save
pm2 startup
```

---

## Kiểm tra log

### Xem log realtime:
```powershell
Get-Content -Path "windsurf-vanban-bot/logs/auto-run.log" -Wait -Tail 10
```

### Xem log gần đây:
```powershell
tail -f "windsurf-vanban-bot/logs/auto-run.log"
```

---

## Dừng/Di chuyển/Tắt tự động chạy

### Tạm dừng:
1. Mở Task Scheduler
2. Tìm "VanBan-Crawler" → Click chuột phải → **Disable**

### Xóa hoàn toàn:
1. Trong Task Scheduler → **Delete**
2. Hoặc chạy lệnh Admin:
```cmd
schtasks /delete /tn "VanBan-Crawler" /f
```

---

## Lưu ý quan trọng

1. **Chrome phải được cài đặt** tại: `C:\Program Files\Google\Chrome\Application\chrome.exe`
2. **Node.js phải được cài đặt**
3. **Tài khoản Windows** cần có quyền chạy script
4. **Khóa màn hình**: Script vẫn chạy được khi máy khóa, nhưng không chạy khi user log off

---

## Troubleshooting

### Lỗi "Access is denied"
→ Chạy file .bat với quyền **Administrator**

### Lỗi "Node.js not found"
→ Cài đặt Node.js từ https://nodejs.org

### Script chạy nhưng không tải được file
→ Kiểm tra log tại `logs/auto-run.log`
→ Có thể do Chrome chưa cài hoặc đường dẫn sai

---

## Tóm tắt

| Phương án | Khi nào chạy | Cách thiết lập |
|-----------|--------------|----------------|
| **On Logon** | Khi user đăng nhập | Chạy `setup-auto-run.bat` |
| **Theo lịch** | Mỗi X phút | Sửa trong Task Scheduler |
| **PM2** | Liên tục 24/7 | Chạy lệnh PM2 |

**Khuyên dùng**: Phương án 1 - Chạy khi đăng nhập, đơn giản và hiệu quả nhất!
