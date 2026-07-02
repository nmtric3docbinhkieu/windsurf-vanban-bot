#!/usr/bin/env python3
"""
Example: Basic usage of Renderer Engine

This example demonstrates how to use the renderer_engine module
to generate Word documents from structured blocks.
"""

from pathlib import Path
from renderer_engine import render_document, parse_content_to_blocks, clean_content

# Example content from AI
content = """Căn cứ Chỉ thị số 03/CT-TTg ngày 30/01/2026 của Thủ tướng Chính phủ về việc ngăn chặn, đẩy lùi bạo lực học đường;
Căn cứ Kế hoạch số 369/KH-UBND ngày 29 tháng 3 năm 2026 của Ủy ban nhân dân tỉnh Đồng Tháp;
Trường THPT Đốc Binh Kiều xây dựng Kế hoạch triển khai thực hiện với các nội dung cụ thể như sau:

I. MỤC ĐÍCH, YÊU CẦU
Cụ thể hóa các nhiệm vụ được UBND tỉnh và Sở GDĐT giao, qua đó quán triệt và chỉ đạo, hướng dẫn thực hiện nghiêm túc các quy định về bảo đảm môi trường giáo dục an toàn, lành mạnh, thân thiện.
Quá trình phân công nhiệm vụ phải tuân thủ triệt để nguyên tắc "06 rõ: Rõ người, rõ việc, rõ thẩm quyền, rõ trách nhiệm, rõ thời gian, rõ kết quả".

II. NHIỆM VỤ VÀ GIẢI PHÁP THỰC HIỆN
1. Đối với Ban Giám hiệu nhà trường
Nhận thức sâu sắc và chịu trách nhiệm trực tiếp, toàn diện về công tác bảo đảm an toàn trong trường học; khẩn trương phân công rõ ràng nhiệm vụ, trách nhiệm đối với từng giáo viên chủ nhiệm, giáo viên bộ môn.
Đẩy mạnh tuyên truyền nâng cao nhận thức, trách nhiệm của cán bộ quản lý, giáo viên, học sinh, gia đình và cộng đồng về phòng, chống bạo lực học đường.

2. Đối với đội ngũ giáo viên
Tăng cường giáo dục đạo đức, lối sống, kỹ năng sống, đặc biệt là kỹ năng kiểm soát cảm xúc cá nhân, giải quyết mâu thuẫn và ứng xử văn hóa cho học sinh thông qua các tiết học chính khóa và hoạt động trải nghiệm.
Thường xuyên giữ mối liên hệ hai chiều, gần gũi với gia đình học sinh để chia sẻ thông tin về tình hình học tập, rèn luyện, cũng như kịp thời nắm bắt các dấu hiệu tâm lý bất thường của học sinh."""

# Step 1: Clean content (remove headers, footers)
content_clean = clean_content(content)

# Step 2: Parse into structured blocks
blocks = parse_content_to_blocks(content_clean)

print(f"=== PARSED {len(blocks)} BLOCKS ===")
for i, block in enumerate(blocks[:10]):
    print(f"{i:2d}: [{block['type']:12s}] {block['text'][:50]}...")

# Step 3: Prepare metadata
metadata = {
    'loai_van_ban': 'KẾ HOẠCH',
    'so_ky_hieu': '123/KH-THPTĐBK',
    'ngay_thang': 'Đốc Bình Kiều, ngày 10 tháng 5 năm 2026',
    'trich_yeu': 'Triển khai thực hiện Chỉ thị số 03/CT-TTg về ngăn chặn bạo lực học đường',
    'noi_nhan': 'Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT',
    'nguoi_ky': 'Nguyễn Minh Trí',
    'chuc_vu_ky': 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG'
}

# Step 4: Render document
template_path = Path(__file__).parent.parent / "TEMPLATE.docx"
output_path = Path(__file__).parent.parent / "van-ban-di" / "example_basic.docx"
output_path.parent.mkdir(parents=True, exist_ok=True)

render_document(template_path, output_path, metadata, blocks)

print(f"\n✅ Document rendered successfully: {output_path}")
