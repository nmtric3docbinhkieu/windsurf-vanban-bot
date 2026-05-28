#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Render KẾ HOẠCH 411 - Tổ chức Giải Thể thao học sinh năm học 2025-2026
Pipeline:
  OCR text (KH411_extracted.txt)
    → soan_van_ban_di._soan_van_ban_offline()  (adapt THPT + sửa nội dung)
    → render_ke_hoach.render_document()         (xuất DOCX chuẩn thể thức)
"""

import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from renderer_engine import clean_content, parse_content_to_blocks
from render_ke_hoach import render_document
from soan_van_ban_di import (
    _lay_context_truong_toi_uu,
    _soan_van_ban_offline,
    dinh_dang_noi_nhan,
    dinh_dang_ngay_thang_hien_tai,
)

# 1. Đọc nội dung OCR đã trích xuất từ PDF 411
ocr_path = Path(__file__).parent.parent / "van-ban-den-xu-ly" / "KH411_extracted.txt"
ocr_raw = ocr_path.read_text(encoding="utf-8")

print(f"📄 Đọc OCR text: {len(ocr_raw)} ký tự từ {ocr_path.name}")

# Làm sạch OCR text: bỏ marker trang, bỏ metadata chữ ký số, bỏ số trang đơn độc
import re
lines = ocr_raw.splitlines()
cleaned_lines = []
for line in lines:
    stripped = line.strip()
    # Bỏ marker --- PAGE X ---
    if re.match(r'^---\s*PAGE\s+\d+\s*---$', stripped):
        continue
    # Bỏ dòng metadata chữ ký số
    if stripped.startswith("SAO Y;"):
        continue
    # Bỏ số trang đơn độc (dòng chỉ có một số)
    if re.match(r'^\d+$', stripped):
        continue
    cleaned_lines.append(line)
ocr_text_full = "\n".join(cleaned_lines).strip()

# Cắt bỏ phần header văn bản (UBND, SỞ GDĐT, số VB, ngày tháng, tiêu đề loại)
# → chỉ giữ từ dòng "Căn cứ" đầu tiên hoặc "I." trở đi
content_start = -1
all_lines_full = ocr_text_full.splitlines()
for idx, line in enumerate(all_lines_full):
    s = line.strip()
    if s.upper().startswith("CĂN CỨ") or re.match(r'^I\.\s+', s):
        content_start = idx
        break

if content_start > 0:
    ocr_text = "\n".join(all_lines_full[content_start:]).strip()
    print(f"📄 Cắt header: bắt đầu dòng {content_start} — '{all_lines_full[content_start].strip()[:70]}'")

    # Trích tên kế hoạch (tiêu đề) từ các dòng header trước content_start
    # Tìm dòng dài nhất sau marker "KẾ HOẠCH" trong phần header
    ocr_trich_yeu = ""
    found_ke_hoach = False
    for line in all_lines_full[:content_start]:
        s = line.strip()
        if not s:
            continue
        sup = s.upper()
        if "KẾ HOẠCH" in sup or "KE HOACH" in sup or "KÉ HOẠCH" in sup:
            found_ke_hoach = True
            continue
        if found_ke_hoach and len(s) > 20:
            # Dòng đầu tiên sau "KẾ HOẠCH" có đủ độ dài → tên kế hoạch
            ocr_trich_yeu = s.rstrip(".")
            break
else:
    ocr_text = ocr_text_full
    ocr_trich_yeu = ""

print(f"📄 Sau làm sạch: {len(ocr_text)} ký tự")

# 2. Lấy context trường và chạy qua offline pipeline
#    _soan_van_ban_offline() sẽ:
#      - Tự nhận loại văn bản (ke_hoach)
#      - Tạo dòng căn cứ chuẩn từ số văn bản + ngày
#      - Rewrite nội dung: thay Sở → Trường, phòng → tổ chuyên môn,...
#      - Normalize số ký hiệu: /KH-THPTĐBK
thong_tin_truong = _lay_context_truong_toi_uu()
du_lieu = _soan_van_ban_offline(ocr_text, thong_tin_truong)

print(f"✅ Đã xử lý offline: loai={du_lieu['loai_van_ban']}, so={du_lieu['so_ky_hieu_goi_y']}")

# 3. Chuẩn bị metadata đúng format cho render_ke_hoach
loai_hien_thi = {
    "ke_hoach": "KẾ HOẠCH",
    "cong_van": "CÔNG VĂN",
    "bao_cao": "BÁO CÁO",
}.get(du_lieu["loai_van_ban"], "KẾ HOẠCH")

noi_nhan_formatted = dinh_dang_noi_nhan(
    du_lieu.get("noi_nhan", ""),
    du_lieu.get("noi_dung", "")
)

# Ưu tiên dùng trich_yeu trích từ tiêu đề OCR (chính xác hơn từ _soan_van_ban_offline)
trich_yeu_final = ocr_trich_yeu if ocr_trich_yeu else du_lieu.get("trich_yeu", "")
# Adapt sang ngôn ngữ trường (bỏ "tỉnh Đông Tháp" → "THPT Đốc Binh Kiều")
trich_yeu_final = trich_yeu_final.replace("tỉnh Đông Tháp", "THPT Đốc Binh Kiều")
trich_yeu_final = trich_yeu_final.replace("Tổ chức", "Tổ chức")  # giữ nguyên động từ

metadata = {
    "loai_van_ban": loai_hien_thi,
    "so_ky_hieu":   du_lieu.get("so_ky_hieu_goi_y", "/KH-THPTĐBK"),
    "ngay_thang":   dinh_dang_ngay_thang_hien_tai(),
    "trich_yeu":    trich_yeu_final,
    "noi_nhan":     noi_nhan_formatted,
    "nguoi_ky":     "Nguyễn Minh Trí",
    "chuc_vu_ky":   "KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG",
}

print(f"📋 Metadata:")
print(f"   loai_van_ban : {metadata['loai_van_ban']}")
print(f"   so_ky_hieu   : {metadata['so_ky_hieu']}")
print(f"   ngay_thang   : {metadata['ngay_thang']}")
print(f"   trich_yeu    : {metadata['trich_yeu'][:60]}...")
print(f"   nguoi_ky     : {metadata['nguoi_ky']}")

# 4. Parse nội dung thành structured blocks
noi_dung_clean = clean_content(du_lieu.get("noi_dung", ""))
blocks = parse_content_to_blocks(noi_dung_clean)
print(f"📦 Parsed {len(blocks)} blocks")

# 5. Render DOCX bằng render_ke_hoach
template_path = Path(__file__).parent / "TEMPLATE.docx"
timestamp = datetime.now().strftime("%H%M%S")
output_path = Path(__file__).parent.parent / "van-ban-di" / f"VBDi_411_KH_TDTT_THPTDBK_{timestamp}.docx"
output_path.parent.mkdir(parents=True, exist_ok=True)

render_document(
    template_path=template_path,
    output_path=output_path,
    metadata=metadata,
    blocks=blocks,
)

print(f"\n🎉 Output: {output_path}")

