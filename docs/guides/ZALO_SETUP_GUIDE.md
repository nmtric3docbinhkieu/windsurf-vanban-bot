# Hướng Dẫn Cấu Hình Zalo OA - Gửi Thông Báo Văn Bản Mới

## Tổng Quan
Hệ thống sẽ gửi thông báo văn bản mới đến Zalo OA của bạn khi có văn bản mới trên hệ thống QLVBĐH.

---

## Bước 1: Truy Cập Zalo Developers

1. Mở trình duyệt và truy cập: **https://developers.zalo.me/**
2. Đăng nhập bằng tài khoản Zalo cá nhân của bạn (quét mã QR hoặc nhập số điện thoại)

---

## Bước 2: Tạo Official Account (OA)

### Nếu bạn chưa có OA:
1. Sau khi đăng nhập, click **"Tạo ứng dụng mới"**
2. Chọn loại ứng dụng: **"Official Account"**
3. Điền thông tin OA:
   - Tên OA: `Văn Bản Đến - Trường THPT` (hoặc tùy ý)
   - Lĩnh vực: `Giáo dục`
   - Mô tả: `Thông báo văn bản mới từ Sở GD&ĐT`
4. Click **"Tạo"**

### Nếu đã có OA:
1. Chọn OA đã có trong danh sách

---

## Bước 3: Lấy Access Token

1. Trong trang quản lý OA, vào menu **"Thông tin"** hoặc **"Công cụ"**
2. Tìm mục **"Access Token"**
3. Click **"Tạo mã truy cập"** hoặc lấy token hiện có
4. Chọn thời hạn: **12 tháng** (tối đa)
5. **Copy và lưu token này** - sẽ dùng cho `ZALO_OA_TOKEN`

> ⚠️ **Lưu ý**: Token này giống như mật khẩu, không chia sẻ cho người khác!

---

## Bước 4: Follow OA (Rất Quan Trọng)

Trước khi OA có thể gửi tin nhắn cho bạn, bạn phải **follow (theo dõi)** OA:

1. Mở ứng dụng Zalo trên điện thoại hoặc máy tính
2. Tìm kiếm tên OA vừa tạo (VD: `Văn Bản Đến - Trường THPT`)
3. Vào trang OA và click **"Theo dõi"** hoặc nhắn tin bất kỳ

---

## Bước 5: Lấy User ID Của Bạn

Sau khi đã follow OA, dùng cách sau để lấy User ID:

### Cách 1: Dùng API trực tiếp (Khuyên dùng)

1. Truy cập URL sau trên trình duyệt (thay `YOUR_TOKEN` bằng token vừa lấy):
```
https://openapi.zalo.me/v3.0/oa/user/getlist?access_token=YOUR_TOKEN&data={"offset":0,"count":10,"user_type":"follower"}
```

2. Trang sẽ trả về JSON, tìm `user_id` trong danh sách:
```json
{
  "data": {
    "users": [
      {
        "user_id": "1234567890123456789",
        "display_name": "Tên của bạn",
        "avatar": "..."
      }
    ]
  }
}
```

3. Copy giá trị `user_id` - sẽ dùng cho `ZALO_USER_ID`

### Cách 2: Dùng Postman/cURL

```bash
curl -X GET "https://openapi.zalo.me/v3.0/oa/user/getlist?data={\"offset\":0,\"count\":10,\"user_type\":\"follower\"}" \
  -H "access_token: YOUR_OA_ACCESS_TOKEN"
```

---

## Bước 6: Cập Nhật File .env

Mở file `.env` trong thư mục `windsurf-vanban-bot/` và thay thế:

```env
ZALO_OA_TOKEN=your_actual_token_here
ZALO_USER_ID=your_actual_user_id_here
```

Ví dụ:
```env
ZALO_OA_TOKEN=4A__...xxx... (chuỗi dài khoảng 100 ký tự)
ZALO_USER_ID=1234567890123456789
```

---

## Bước 7: Test Gửi Tin Nhắn

Sau khi cấu hình xong, chạy test:

```bash
node windsurf-vanban-bot/crawl-download-fast.js
```

Nếu có văn bản mới, bạn sẽ nhận tin nhắn Zalo như sau:

```
📄 VĂN BẢN MỚI ĐẾN

Số hiệu: 362/KH-SGDĐT
Ngày ban hành: 15/04/2026
Cơ quan: Sở Giáo dục và Đào tạo - Tỉnh Đồng Tháp

📋 Trích yếu: Kế hoạch Đón tiếp và làm việc với Đoàn kiểm tra...

⏰ Văn bản đã được tải về thư mục van-ban-den/
```

---

## Xử Lý Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| "Chưa cấu hình Zalo OA" | Chưa cập nhật .env | Kiểm tra lại file .env |
| "Lỗi gửi Zalo" Token hết hạn | Vào developers.zalo.me tạo token mới |
| "Invalid recipient" | Chưa follow OA | Mở Zalo, tìm OA và nhấn "Theo dõi" |
| Không nhận được tin | User ID sai | Kiểm tra lại user_id từ API |

---

## Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra token còn hiệu lực tại: https://developers.zalo.me/
2. Đảm bảo đã follow OA
3. Kiểm tra log khi chạy crawl để xem lỗi cụ thể
