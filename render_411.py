#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Render Document 411 DOCX - sử dụng đúng pipeline của tao_van_ban_docx"""

import json
import sys
from pathlib import Path
from datetime import datetime
sys.path.insert(0, r'd:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\vanban-bot')

from soan_van_ban_di import tao_van_ban_docx

# Load Document 411 JSON (đã có OCR + adapt nội dung)
json_path = r'd:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\vanban-bot\noi_dung_ke_hoach_411.json'
with open(json_path, 'r', encoding='utf-8') as f:
    du_lieu = json.load(f)

# Gọi đúng hàm pipeline đã hoàn chỉnh trong soan_van_ban_di.py
# tao_van_ban_docx xử lý: loai_hien_thi, so_ky_hieu, ngay_thang, nguoi_ky, chuc_vu_ky
output_file = tao_van_ban_docx(du_lieu, ten_file_goc="411_KH_GDTT_THPTDBK")

print(f"✅ Document 411 rendered successfully!")
print(f"Output: {output_file}")
