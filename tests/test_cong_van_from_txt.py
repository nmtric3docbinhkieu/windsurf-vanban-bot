#!/usr/bin/env python3
"""Kiểm tra bộ đọc TXT công văn từ DeepSeek."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from render_cong_van import _safe_file_tag
from render_cong_van_from_txt import CAU_KET_CONG_VAN, parse_cong_van_text


SAMPLE_TEXT = """SỐ KÝ HIỆU: 123/THPTĐBK
TRÍCH YẾU: V/v thực hiện việc A
KÍNH GỬI: Tổ A; Tổ B
NƠI NHẬN: Tổ A; Tổ B; Lưu: VT
NỘI DUNG:
Trường THPT Đốc Binh Kiều đề nghị Tổ A thực hiện nội dung sau.
Thời gian thực hiện: Theo kế hoạch.
Thời hạn thực hiện theo nội dung đã được cung cấp."""


result = parse_cong_van_text(SAMPLE_TEXT)

assert result["loai_van_ban"] == "cong_van"
assert result["so_ky_hieu_goi_y"] == "123/THPTĐBK"
assert result["kinh_gui"] == [
	"Các tổ chuyên môn, tổ văn phòng;",
	"Giáo viên chủ nhiệm;",
	"Đoàn TNCS HCM trường.",
]
assert result["noi_nhan"] == (
	"Sở GDĐT Đồng Tháp (báo cáo); Hiệu trưởng, các Phó Hiệu trưởng; "
	"Các tổ chuyên môn, tổ văn phòng; Đoàn TNCSHCM; Lưu: VT"
)
assert result["noi_dung"].startswith("Trường THPT Đốc Binh Kiều")
assert "nội dung sau:" in result["noi_dung"]
assert "nội dung sau." not in result["noi_dung"]
assert "Thời gian thực hiện:" not in result["noi_dung"]
assert result["noi_dung"].endswith(CAU_KET_CONG_VAN)
assert _safe_file_tag("V/v thực hiện việc A") == "Vv_thực_hiện_việc_A"

print("Cong van TXT parser: PASS")