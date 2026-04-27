#!/usr/bin/env python3
"""Chuẩn hóa kế hoạch từ file thô"""

from chuan_hoa_van_ban import tao_van_ban_chuan
from pathlib import Path

# Tạo thư mục van-ban-di nếu chưa có
output_dir = Path(r"d:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\van-ban-di")
output_dir.mkdir(exist_ok=True)

# Chuẩn hóa văn bản
tao_van_ban_chuan(
    input_file="noi_dung_ke_hoach.txt",
    output_file=str(output_dir / "391-KH-SGDĐT-ngan-chan-bao-luc-hoc-duong-21-04-2026.docx"),
    loai="ke_hoach",
    so_ky_hieu="391/KH-SGDĐT",
    trich_yeu="Triển khai thực hiện Chỉ thị số 03/CT-TTg ngày 30/01/2026 của Thủ tướng Chính phủ về việc ngăn chặn, đẩy lùi bạo lực học đường trong ngành Giáo dục tỉnh Đồng Tháp",
    noi_nhan="Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT",
    ngay_thang="Đốc Binh Kiều, ngày 21 tháng 04 năm 2026"
)
