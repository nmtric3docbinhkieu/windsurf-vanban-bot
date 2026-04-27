# HƯỚNG DẪN TÍCH HỢP MODULE SOẠN VĂN BẢN ĐI
# Dự án: vanban-bot | Trường THPT Đốc Bình Kiều
# Module: soan_van_ban_di.py

## ======================================================
## VỊ TRÍ MODULE TRONG DỰ ÁN
## ======================================================

Cấu trúc thư mục đề xuất cho dự án vanban-bot:

```
vanban-bot/
│
├── main.py                    ← File chạy chính (pipeline đầy đủ)
├── soan_van_ban_di.py         ← MODULE MỚI (file bạn vừa nhận)
│
├── dang_nhap_tai_van_ban.py   ← Bước 1: đăng nhập vpdt.gov.vn, tải file
├── dat_ten_file.py            ← Bước 2: đọc nội dung, đặt lại tên file
├── di_chuyen_file.py          ← Bước 3: chuyển file đã đặt tên sang thư mục
│
├── van_ban_den/               ← File tải về (chưa xử lý)
├── van_ban_den_xu_ly/         ← File đã đặt tên xong (đầu vào bước 4)
└── van_ban_di/                ← File văn bản đi (đầu ra bước 4 — MODULE MỚI)
```

## ======================================================
## CÀI ĐẶT THƯ VIỆN CẦN THIẾT
## ======================================================

Chạy lệnh này trong terminal (1 lần duy nhất):

```bash
pip install anthropic python-docx
```

Thư viện `anthropic` đã có sẵn nếu dự án đang dùng AI.
Thư viện `python-docx` dùng để tạo file Word.

## ======================================================
## CÁCH DÙNG — 3 CÁCH
## ======================================================

### CÁCH 1: Xử lý 1 file cụ thể (test nhanh)
```bash
python soan_van_ban_di.py "van_ban_den_xu_ly/1143-SGDĐT-TCCB_tang_cuong...docx"
```

### CÁCH 2: Xử lý toàn bộ thư mục van_ban_den_xu_ly
```bash
python soan_van_ban_di.py
```

### CÁCH 3: Gọi từ main.py (tích hợp pipeline)
```python
# Trong main.py, sau khi bước 3 di chuyển file xong:
from soan_van_ban_di import xu_ly_thu_muc, xu_ly_mot_van_ban

# Xử lý toàn bộ thư mục
ket_qua = xu_ly_thu_muc("van_ban_den_xu_ly")

# Hoặc xử lý 1 file
ket_qua = xu_ly_mot_van_ban("van_ban_den_xu_ly/ten_file.docx")
print(ket_qua)
# Output: {"van_ban_di": "van_ban_di/VBDi_..._cong_van.docx", "bao_cao": "..."}
```

## ======================================================
## BIẾN MÔI TRƯỜNG CẦN THIẾT
## ======================================================

Module dùng thư viện `anthropic` — thư viện này tự đọc API key
từ biến môi trường ANTHROPIC_API_KEY.

Nếu dự án chưa có, thêm vào file .env hoặc chạy:
```bash
# Windows
set ANTHROPIC_API_KEY=sk-ant-...

# Mac/Linux
export ANTHROPIC_API_KEY=sk-ant-...
```

Nếu dự án đã dùng AI ở các bước trước thì không cần thêm.

## ======================================================
## ĐẦU VÀO / ĐẦU RA
## ======================================================

ĐẦU VÀO:
  - File .docx hoặc .pdf văn bản đến từ Sở GDĐT
  - Đặt trong thư mục: van_ban_den_xu_ly/

ĐẦU RA (tự động tạo trong thư mục van_ban_di/):
  - VBDi_[tên_file_gốc]_cong_van.docx    ← công văn đi
  - VBDi_[tên_file_gốc]_ke_hoach.docx    ← kế hoạch đi
  - VBDi_[tên_file_gốc]_bao_cao.docx     ← báo cáo (nếu Sở yêu cầu báo cáo)

## ======================================================
## AI TỰ NHẬN BIẾT LOẠI VĂN BẢN
## ======================================================

AI sẽ tự phân loại và soạn phù hợp:

| Văn bản đến               | Văn bản đi được soạn                    |
|---------------------------|------------------------------------------|
| Công văn triển khai       | Công văn chuyển tiếp + triển khai        |
| Kế hoạch của Sở           | Kế hoạch thực hiện của trường            |
| Công văn yêu cầu báo cáo  | Công văn + BÁO CÁO riêng                 |
| Quyết định phê duyệt      | Công văn tiếp nhận/triển khai            |
| Thông báo kết quả         | Công văn thông báo đến GV-HS             |

## ======================================================
## GHI CHÚ KỸ THUẬT (cho Windsurf)
## ======================================================

- Model AI dùng: claude-opus-4-5 (có thể đổi sang claude-sonnet-4-5 để nhanh hơn)
- Font văn bản: Times New Roman 13pt (đúng quy định)
- Lề trang: Trái 3cm, Phải 2cm, Trên 2cm, Dưới 2cm
- Người ký mặc định: PHÓ HIỆU TRƯỞNG Nguyễn Minh Trí
- Thể thức: theo mẫu Sở GDĐT Đồng Tháp
- Không điền ngày tháng (để trống để người dùng điền tay trước khi ký)
