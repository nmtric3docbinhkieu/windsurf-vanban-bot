#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate school-specific kế hoạch JSON for Document 411 (Sports competition plan)
Based on provincial plan, adapted to THPT Đốc Binh Kiều
"""

import json
from datetime import datetime

# Load extracted PDF content
pdf_path = r'd:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\van-ban-den-xu-ly\KH411_extracted.txt'
with open(pdf_path, 'r', encoding='utf-8') as f:
    pdf_content = f.read()

# School information
TRUONG = "THPT Đốc Binh Kiều"
NAM_HOC = "2025 - 2026"

# Extract and adapt content for school level
content_parts = {
    "purpose": """I. MỤC ĐÍCH, YÊU CẦU

1. Mục đích

Dây mạnh cuộc vận động "toàn dân rèn luyện thân thể theo gương Bác Hồ vĩ đại"; thường xuyên tập luyện, thi đấu thể thao nhằm rèn luyện sức khỏe, phát triển thể chất, góp phần giáo dục toàn diện cho học sinh.

Phát hiện, tuyển chọn, bồi dưỡng vận động viên học sinh xuất sắc, đại diện Trường tham dự Giải Thể thao học sinh tỉnh Đông Tháp năm học 2025-2026 tổ chức tại tỉnh Lâm Đông.

Thông qua Giải, nhằm nâng cao tinh thần trách nhiệm, trình độ tổ chức phong trào thể thao trong nhà trường, tăng cường cơ sở vật chất và sự phối hợp với các ngành liên quan, tạo điều kiện thuận lợi để phát triển phong trào rèn luyện TDTT và giáo dục thể chất trong Trường.

2. Yêu cầu

Công tác tổ chức Giải đảm bảo công bằng, trung thực, an toàn và hiệu quả; tạo điều kiện thuận lợi để các đội tuyển tham gia dự thi.

Các tổ chuyên môn phòng Giáo dục phổ thông cần tăng cường cơ sở vật chất, sân tập, nhà tập và các trang thiết bị dụng cụ để phục vụ cho việc dạy và học môn GDTC, tổ chức các hoạt động TDTT ngoại khóa và thí đấu thể thao trong Trường.""",

    "participants": """II. ĐỐI TƯỢNG THAM DỰ

1. Đối tượng tham dự

- Học sinh đang học lớp 10 và lớp 11 tại THPT Đốc Binh Kiều năm học 2025-2026
- Độ tuổi từ 16 tuổi đến 17 tuổi (sinh từ ngày 31/12/2010 trở về trước đến ngày 01/01/2009)

2. Lưu ý đặc biệt

Học sinh tham gia thí đấu phải có giấy xác nhận tham gia đủ sức khỏe, không có tiền sử bệnh lý về tim mạch, thần kinh và các bệnh lý khác không đủ sức khỏe để thi đấu thể thao.

Không được tham dự giải thể thao:
- Học sinh là vận động viên đã và đang được đào tạo tại các trung tâm, câu lạc bộ đào tạo vận động viên thuộc các Bộ, ngành, địa phương, trường năng khiếu thể dục thể thao được hưởng chế độ từ ngân sách nhà nước trong khoảng thời gian từ 01/01/2024 đến thời điểm tổ chức Giải.
- Học sinh đã đoạt huy chương tại các giải thể thao quốc tế hằng năm.""",

    "events": """III. MÔN THI, THỜI GIAN, ĐỊA ĐIỂM

1. Môn thi: Điền kinh, Bơi, Cầu lông

2. Thời gian: Dự kiến trong tháng 5 và tháng 6 năm 2026

3. Địa điểm:

Các hoạt động tập huấn: Tại các cơ sở của Trường
Thi đấu: Tại các địa điểm được Ban Tổ chức thông báo (dự kiến tại Trường Phổ thông Năng khiếu và Huấn luyện, Thi đấu thể thao tỉnh)""",

    "budget": """IV. KINH PHÍ

Ban Giám hiệu: Chỉ kinh phí tổ chức, tập huấn từ nguồn kinh phí sự nghiệp giáo dục và nguồn kinh phí hợp pháp khác (nếu có) theo quy định hiện hành.

Các tổ chuyên môn và học sinh tham dự: Các chi phí liên quan trong quá trình tập huấn và tham dự Giải do Trường cân đối từ nguồn kinh phí sự nghiệp giáo dục, kinh phí hoạt động của Nhà trường và nguồn thu hợp pháp khác (nếu có) theo quy định hiện hành.""",

    "implementation": """V. TỔ CHỨC THỰC HIỆN

1. Ban Chỉ đạo

- Hiệu trưởng: Chủ tịch Ban Chỉ đạo
- Các Tổ trưởng các tổ chuyên môn: Thành viên
- Trung tâm Công nghệ Thông tin (CNTT): Phối hợp

2. Ban Tổ chức Giải

Được thành lập để trực tiếp chuẩn bị, tổ chức Giải theo kế hoạch, bao gồm:
- Trưởng Ban Tổ chức: Phó Hiệu trưởng phụ trách Giáo dục phổ thông
- Các Tổ trưởng các tổ chuyên môn: Thành viên chính
- Trưởng phòng Hành chính - Nhân sự: Phối hợp vấn đề tổ chức

3. Nhiệm vụ của các đơn vị

Tổ Giáo dục thể chất - Giáo dục quốc phòng:
- Chủ trì xây dựng Điều lệ môn thi, ban hành hướng dẫn tổ chức Giải
- Chuẩn bị cơ sở vật chất, trang thiết bị, dụng cụ thi đấu
- Tổ chức tập huấn, luyện tập cho các đội tuyển

Tổ Công nghệ Thông tin:
- Hỗ trợ quản lý kết quả thi đấu, thông báo thông tin liên quan

Ban Hành chính - Nhân sự:
- Hỗ trợ lễ tổng kết, khen thưởng các cá nhân và tập thể có thành tích xuất sắc

4. Khen thưởng

Căn cứ vào kết quả thi đấu được quy định trong Điều lệ Giải, Ban Tổ chức công nhận kết quả, cấp giấy chứng nhận và khen thưởng các giải thưởng cá nhân và tập thể như sau:

- Tặng huy chương vàng, bạc, đồng cho các vận động viên đạt thành tích giải nhất/huy chương vàng (HCV), giải nhì/huy chương bạc (HCB), giải ba/huy chương đồng (HCĐ)
- Cấp Giấy chứng nhận cho các vận động viên đạt thành tích HCV, HCB, HCĐ
- Khen thưởng các Tổ chuyên môn có thành tích xuất sắc trong tổ chức, chuẩn bị và tham dự Giải"""
}

# Combine all parts
full_content = f"{content_parts['purpose']}\n\n{content_parts['participants']}\n\n{content_parts['events']}\n\n{content_parts['budget']}\n\n{content_parts['implementation']}"

# Create 6-key JSON
noi_dung_json = {
    "loai_van_ban": "ke_hoach",
    "so_ky_hieu_goi_y": "/KH-THPTĐBK",
    "trich_yeu": "V/v Kế hoạch tổ chức Giải Thể thao học sinh năm học 2025-2026",
    "tom_tat_yeu_cau": "Ban hành Kế hoạch tổ chức Giải Thể thao học sinh THPT Đốc Binh Kiều năm học 2025-2026, bao gồm các môn thi: Điền kinh, Bơi, Cầu lông. Thời gian dự kiến trong tháng 5 và tháng 6 năm 2026.",
    "noi_nhan": "- Ban Giám hiệu\n- Các Tổ chuyên môn\n- Tổng Thư ký\n- Phòng Hành chính - Nhân sự\n- Tổ CNTT",
    "noi_dung": full_content
}

# Save to JSON file
output_path = r'd:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\vanban-bot\noi_dung_ke_hoach_411.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(noi_dung_json, f, ensure_ascii=False, indent=2)

print(f"✅ Created school-specific JSON for Document 411")
print(f"Output: {output_path}")
print(f"\nContent preview:")
print(f"- loai_van_ban: {noi_dung_json['loai_van_ban']}")
print(f"- so_ky_hieu_goi_y: {noi_dung_json['so_ky_hieu_goi_y']}")
print(f"- trich_yeu: {noi_dung_json['trich_yeu']}")
print(f"- Full content length: {len(noi_dung_json['noi_dung'])} characters")
