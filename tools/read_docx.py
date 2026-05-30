#!/usr/bin/env python3
"""Đọc nội dung file docx từ thư mục van-ban-den-xu-ly."""

import argparse
from docx import Document
from pathlib import Path


def main() -> None:
	project_root = Path(__file__).resolve().parents[2]
	default_input = project_root / "van-ban-den-xu-ly" / "KH-SGDĐT_ngan_chan_day_lui_bao_luc_hoc_duong_trong_nganh_giao_duc_tinh_dong_thap_thuc_hien_ke_hoach_so_29_03_2026.docx"

	parser = argparse.ArgumentParser(description="Đọc nhanh nội dung một file DOCX")
	parser.add_argument("input_file", nargs="?", default=str(default_input))
	args = parser.parse_args()

	doc = Document(args.input_file)
	content = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
	print(content)


if __name__ == "__main__":
	main()
