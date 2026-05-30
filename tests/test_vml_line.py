#!/usr/bin/env python3
"""Test file để kiểm tra VML line trong header"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tools.chuan_hoa_van_ban import tao_van_ban_chuan


TESTS_DIR = Path(__file__).resolve().parent

# Tạo file test
tao_van_ban_chuan(
    input_file=str(TESTS_DIR / "test_input.txt"),
    output_file=str(TESTS_DIR / "test_vml_output_v8.docx"),
    loai="ke_hoach",
    so_ky_hieu="369/KH-UBND",
    trich_yeu="Về việc ngăn chặn, đẩy lùi bạo lực học đường",
    noi_nhan="Trường THPT Đốc Bình Kiều; Phòng GDĐT huyện; Sở GDĐT Đồng Tháp",
    ngay_thang="Đốc Binh Kiều, ngày 29 tháng 03 năm 2026"
)
