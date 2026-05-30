# HƯỚNG DẪN SỬ DỤNG TEMPLATE-BASED APPROACH

## Tổng quan

Thay vì tạo file DOCX từ đầu bằng code (cách khó, dễ lỗi), chúng ta sẽ:
1. Tạo template DOCX chuẩn bằng Word
2. Chèn placeholder (ví dụ: {{so_ky_hieu}}, {{noi_dung}})
3. AI chỉ sinh nội dung
4. Python inject nội dung vào template

## Cài đặt

```bash
cd "d:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\windsurf-vanban-bot"
python -m pip install docxtpl
```

## Cách tạo Template

### 1. Placeholder

Trong file TEMPLATE.docx, bạn cần chèn các placeholder theo định dạng `{{tên_placeholder}}`:

- `{{loai_van_ban}}` - Loại văn bản (KẾ HOẠCH, QUYẾT ĐỊNH, v.v.)
- `{{so_ky_hieu}}` - Số ký hiệu văn bản
- `{{ngay_thang}}` - Ngày tháng (ví dụ: "Đốc Bình Kiều, ngày 10 tháng 5 năm 2026")
- `{{trich_yeu}}` - Trích yếu văn bản
- `{{noi_dung}}` - Nội dung chính (đây là phần quan trọng nhất)
- `{{noi_nhan}}` - Nơi nhận
- `{{nguoi_ky}}` - Người ký
- `{{chuc_vu_ky}}` - Chức vụ người ký

### 2. Định dạng trong Template

- **Font**: Times New Roman, kích thước 14pt
- **Lề**: Trái 3cm, Phải 2cm, Trên 2cm, Dưới 2cm
- **Căn lề**: Căn đều (justify)
- **Line spacing**: 1.5 dòng (18pt)

### 3. Bố cục

Template nên có các phần sau (theo thứ tự từ trên xuống):

1. **Header**: Bảng 2x3 chứa
   - Cột trái: Cơ quan chủ quản (SỞ GDĐT TỈNH ĐỒNG THÁP\nTRƯỜNG THPT ĐỐC BINH KIỀU)
   - Cột phải: Quốc hiệu, tiêu ngữ (CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do)

2. **Số ký hiệu**: `{{so_ky_hieu}}` (nằm ở bên trái, cùng dòng với ngày tháng)

3. **Ngày tháng**: `{{ngay_thang}}` (nằm ở bên phải, cùng dòng với số ký hiệu)

4. **Loại văn bản**: `{{loai_van_ban}}` (nằm dưới ngày tháng, in đậm, in hoa)

5. **Trích yếu**: `{{trich_yeu}}` (nằm dưới loại văn bản, in nghiêng)

6. **Nội dung chính**: `{{noi_dung}}` (phần lớn nhất của văn bản)

7. **Nơi nhận**: `{{noi_nhan}}` (nằm ở cuối văn bản, bên trái)

8. **Chữ ký**: Bảng 2x1 chứa
   - Cột trái: `{{noi_nhan}}` (nơi nhận)
   - Cột phải: `{{nguoi_ky}}` và `{{chuc_vu_ky}}` (chức vụ và người ký)

## Cách sử dụng

### 1. Tạo Template

Mở file `TEMPLATE.docx` trong Microsoft Word và:
1. Thiết lập trang (Page Setup) với lề đúng quy định
2. Tạo bảng header với quốc hiệu
3. Chèn các placeholder ở vị trí thích hợp
4. Định dạng font, spacing theo quy định
5. Lưu file

### 2. Inject nội dung

```python
from template_inject import inject_van_ban_di
from pathlib import Path

# Đường dẫn
template_path = Path("TEMPLATE.docx")
output_path = Path("van-ban-di/output.docx")

# Dữ liệu cần inject
data = {
    'loai_van_ban': 'KẾ HOẠCH',
    'so_ky_hieu': '123/KH-THPTĐBK',
    'ngay_thang': 'Đốc Bình Kiều, ngày 10 tháng 5 năm 2026',
    'trich_yeu': 'Triển khai thực hiện Chỉ thị số 03/CT-TTg',
    'noi_dung': 'Nội dung văn bản...',
    'noi_nhan': 'Sở GDĐT Đồng Tháp',
    'nguoi_ky': 'Nguyễn Minh Trí',
    'chuc_vu_ky': 'KT. HIỆU TRƯỞNG'
}

# Inject (use_richtext=False cho text thường)
inject_van_ban_di(template_path, data, output_path, use_richtext=False)
```

### 3. Tích hợp vào workflow hiện tại

Trong `soan_van_ban_di.py`, sau khi AI trả về JSON, bạn có thể:

```python
from template_inject import inject_van_ban_di, get_template_path

# Lấy template theo loại văn bản
template_path = get_template_path(loai_van_ban)

# Chuẩn bị dữ liệu
data = {
    'loai_van_ban': loai_van_ban.upper(),
    'so_ky_hieu': ai_response['SO_KY_HIEU'],
    'ngay_thang': ai_response['NGAY_THANG'],
    'trich_yeu': ai_response['TRICH_YEU'],
    'noi_dung': ai_response['NOI_DUNG'],
    'noi_nhan': ai_response['NOI_NHAN'],
    'nguoi_ky': ai_response['NGUOI_KY'],
    'chuc_vu_ky': ai_response['CHUC_VU_KY']
}

# Inject với text thường
inject_van_ban_di(template_path, data, output_path, use_richtext=False)
```

## Hạn chế và Lưu ý quan trọng

### Hạn chế của docxtpl

1. **Định dạng nội dung phức tạp**: docxtpl không hỗ trợ RichText tốt cho định dạng phức tạp (in đậm đề mục, thụt đầu dòng). Khi inject nội dung, đề mục sẽ không được in đậm và không thụt đầu dòng tự động.

2. **Giải pháp**: 
   - Cách 1 (Khuyên dùng): Inject text thường, sau đó định dạng trong Word thủ công
   - Cách 2: Dùng script cũ `chuan_hoa_vanban.py` cho nội dung phức tạp cần định dạng đẹp

### Lưu ý quan trọng

1. **Lọc nội dung**: Script tự động lọc bỏ tiêu đề loại văn bản (KẾ HOẠCH, QUYẾT ĐỊNH, v.v.) và footer khỏi nội dung inject
2. **Định dạng sau inject**: Sau khi inject, cần mở file trong Word và định dạng thủ công:
   - In đậm các đề mục (I, II, III, 1, 2, 3, a, b, c)
   - Thụt đầu dòng cho các cấp đề mục
   - Đảm bảo spacing và font đồng nhất
3. **Dễ chỉnh sửa**: Chỉ cần sửa template trong Word, không cần sửa code
4. **Giữ nguyên format**: 100% thể thức Word được giữ nguyên
5. **Dễ maintain**: Tách biệt giữa nội dung (AI) và format (template)

## So sánh với cách cũ

| Tiêu chí | Template (docxtpl) | Script cũ (chuan_hoa_vanban.py) |
|----------|-------------------|---------------------------------|
| Dễ chỉnh sửa template | ✅ Dễ (trong Word) | ❌ Khó (phải sửa code) |
| Định dạng đẹp | ❌ Khó (cần thủ công) | ✅ Tự động |
| Tốc độ | ✅ Nhanh | ✅ Nhanh |
| Linh hoạt | ✅ Cao (thay template dễ) | ❌ Thấp (phải sửa code) |
| Code complexity | ✅ Đơn giản (~50 dòng) | ❌ Phức tạp (~741 dòng) |

**Khuyến nghị**: 
- Dùng template cho các trường hợp cần thay đổi thể thức thường xuyên
- Dùng script cũ cho các trường hợp cần định dạng đẹp tự động

## Test

Chạy test trong `template_inject.py`:

```bash
python template_inject.py
```

Sẽ tạo file:
- `test_template_final.docx` - Test với dữ liệu kế hoạch
