# HƯỚNG DẪN SỬ DỤNG MODULE SOẠN VĂN BẢN ĐI
# Dự án: vanban-bot | Trường THPT Đốc Binh Kiều
# Module: soan_van_ban_di.py

## ======================================================
## CÀI ĐẶT PYTHON VÀ THƯ VIỆN
## ======================================================

### Bước 1: Kiểm tra Python
Mở terminal và chạy:
```bash
python --version
```
Nếu chưa có Python, tải tại: https://www.python.org/downloads/ (phiên bản 3.9 trở lên)

### Bước 2: Cài đặt thư viện
Vào thư mục `windsurf-vanban-bot` và chạy:
```bash
cd "d:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\windsurf-vanban-bot"
pip install -r requirements.txt
```

Hoặc cài từng thư viện:
```bash
pip install openai python-docx python-dotenv pdf-parse
```

## ======================================================
## CẤU TRÚC THƯ MỤC
## ======================================================

```
DuAn_VanBan_TruongDBK/
├── van-ban-den-xu-ly/     ← Đưa văn bản đến cần soạn vào đây
├── van-ban-di/            ← Văn bản đi sẽ xuất ra đây (tự tạo)
└── windsurf-vanban-bot/
    ├── .env               ← Đã có DEEPSEEK_API_KEY
    ├── soan_van_ban_di.py ← Module soạn văn bản
    └── requirements.txt   ← Danh sách thư viện Python
```

## ======================================================
## CÁCH SỬ DỤNG
## ======================================================

### Cách 1: Xử lý 1 file cụ thể
```bash
cd "d:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\windsurf-vanban-bot"
python soan_van_ban_di.py "../van-ban-den-xu-ly/ten-file.docx"
```

### Cách 2: Xử lý toàn bộ thư mục
```bash
cd "d:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\windsurf-vanban-bot"
python soan_van_ban_di.py
```

## ======================================================
## ĐẦU VÀO / ĐẦU RA
## ======================================================

**ĐẦU VÀO:**
- File .docx hoặc .pdf trong thư mục `van-ban-den-xu-ly/`

**ĐẦU RA:**
- File Word trong thư mục `van-ban-di/`
- Tên file: `VBDi_[tên_gốc]_[loại].docx`
- Ví dụ: `VBDi_KH-SGDĐT_ngan_chan..._ke_hoach.docx`

## ======================================================
## AI TỰ NHẬN BIẾT LOẠI VĂN BẢN
## ======================================================

| Văn bản đến               | Văn bản đi được soạn                    |
|---------------------------|------------------------------------------|
| Công văn triển khai       | Công văn chuyển tiếp + triển khai        |
| Kế hoạch của Sở           | Kế hoạch thực hiện của trường            |
| Công văn yêu cầu báo cáo  | Công văn + BÁO CÁO riêng                 |
| Quyết định phê duyệt      | Công văn tiếp nhận/triển khai            |
| Thông báo kết quả         | Công văn thông báo đến GV-HS             |

## ======================================================
## THỂ THỨC VĂN BẢN
## ======================================================

- Font: Times New Roman 13pt
- Lề: Trái 3cm, Phải 2cm, Trên 2cm, Dưới 2cm
- Người ký: PHÓ HIỆU TRƯỞNG Nguyễn Minh Trí
- Quốc hiệu/Tiêu ngữ: Bảng 2 cột
- Số ký hiệu + Ngày tháng: Bảng 2 cột
- Nơi nhận + Chữ ký: Bảng 2 cột

## ======================================================
## GIÁ PHÍ DEEPSEEK
## ======================================================

- Model: deepseek-v4-pro
- Giá: ~1.1 triệu VNĐ/1M tokens input, ~2.2 triệu/1M tokens output
- 1 văn bản trung bình tốn ~500-1000 tokens → rất rẻ

## ======================================================
## XỬ LÝ LỖI THƯỜNG GẶP
## ======================================================

**Lỗi: "DEEPSEEK_API_KEY không có trong biến môi trường"**
- Kiểm tra file .env có dòng: `DEEPSEEK_API_KEY=sk-...`

**Lỗi: "Không đọc được file PDF"**
- Chạy: `pip install pdf-parse`

**Lỗi: "ModuleNotFoundError: No module named 'docx'"**
- Chạy: `pip install python-docx`

**Lỗi: "Thư mục không tồn tại"**
- Đảm bảo thư mục `van-ban-den-xu-ly` tồn tại ở thư mục gốc dự án
