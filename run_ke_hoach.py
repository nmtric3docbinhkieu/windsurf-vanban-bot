#!/usr/bin/env python3
"""Chuẩn hóa kế hoạch từ file thô"""

from tools.chuan_hoa_van_ban import tao_van_ban_chuan
from pathlib import Path

bot_dir = Path(__file__).resolve().parent

# Tạo thư mục van-ban-di nếu chưa có
output_dir = Path(r"d:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\van-ban-di")
output_dir.mkdir(exist_ok=True)

# Chuẩn hóa văn bản (số hiệu và ngày tháng sẽ tự động lấy từ code)
tao_van_ban_chuan(
    input_file=str(bot_dir / "noi_dung_ke_hoach.txt"),
    output_file=str(output_dir / "KH-THPTĐBK-ngan-chan-bao-luc-hoc-duong-v12.docx"),
    loai="ke_hoach",
    trich_yeu="Triển khai thực hiện Chỉ thị số 03/CT-TTg ngày 30/01/2026 của Thủ tướng Chính phủ về việc ngăn chặn, đẩy lùi bạo lực học đường trong ngành Giáo dục tỉnh Đồng Tháp",
    noi_nhan="Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT"
)
