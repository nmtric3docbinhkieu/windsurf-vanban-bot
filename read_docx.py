#!/usr/bin/env python3
"""Đọc nội dung file docx từ thư mục van-ban-den-xu-ly"""

from docx import Document
from pathlib import Path

input_file = r"d:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\van-ban-den-xu-ly\KH-SGDĐT_ngan_chan_day_lui_bao_luc_hoc_duong_trong_nganh_giao_duc_tinh_dong_thap_thuc_hien_ke_hoach_so_29_03_2026.docx"

doc = Document(input_file)
content = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

print(content)
