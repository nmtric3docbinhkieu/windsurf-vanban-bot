#!/usr/bin/env python3
"""Render KẾ HOẠCH từ file TXT nội dung AI (manual workflow qua trình duyệt)."""

import argparse
from datetime import datetime
from pathlib import Path

from render_ke_hoach import render_document
from renderer_engine import clean_content, parse_content_to_blocks


def _default_ngay_thang() -> str:
    now = datetime.now()
    return f"ngày {now.day} tháng {now.month} năm {now.year}"


def main() -> None:
    root_dir = Path(__file__).resolve().parent.parent
    bot_dir = Path(__file__).resolve().parent

    parser = argparse.ArgumentParser(
        description="Render DOCX KẾ HOẠCH từ file TXT nội dung AI"
    )
    parser.add_argument(
        "--input-txt",
        default=str(bot_dir / "noi_dung_ke_hoach.txt"),
        help="Đường dẫn file TXT chứa nội dung AI",
    )
    parser.add_argument(
        "--template",
        default=str(bot_dir / "TEMPLATE.docx"),
        help="Đường dẫn TEMPLATE.docx",
    )
    parser.add_argument(
        "--output-dir",
        default=str(root_dir / "van-ban-di"),
        help="Thư mục xuất file DOCX",
    )
    parser.add_argument(
        "--file-tag",
        default="manual-ai",
        help="Tag tên file output",
    )
    parser.add_argument(
        "--so-ky-hieu",
        default="/KH-THPTĐBK",
        help="Số ký hiệu văn bản",
    )
    parser.add_argument(
        "--trich-yeu",
        required=True,
        help="Trích yếu nội dung kế hoạch",
    )
    parser.add_argument(
        "--noi-nhan",
        default="Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT",
        help="Nơi nhận dạng chuỗi ;",
    )
    parser.add_argument(
        "--nguoi-ky",
        default="Nguyễn Minh Trí",
        help="Người ký",
    )
    parser.add_argument(
        "--chuc-vu-ky",
        default="KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG",
        help="Chức vụ ký (cho phép xuống dòng bằng \\n)",
    )
    args = parser.parse_args()

    input_txt = Path(args.input_txt)
    template_path = Path(args.template)
    output_dir = Path(args.output_dir)

    if not input_txt.exists():
        raise FileNotFoundError(f"Không tìm thấy input txt: {input_txt}")
    if not template_path.exists():
        raise FileNotFoundError(f"Không tìm thấy template: {template_path}")

    output_dir.mkdir(parents=True, exist_ok=True)

    raw_text = input_txt.read_text(encoding="utf-8")
    content_clean = clean_content(raw_text)
    blocks = parse_content_to_blocks(content_clean)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_tag = "".join(ch for ch in args.file_tag if ch.isalnum() or ch in ("-", "_")) or "manual-ai"
    output_path = output_dir / f"VBDi_{safe_tag}_ke_hoach_{timestamp}.docx"

    metadata = {
        "loai_van_ban": "KẾ HOẠCH",
        "so_ky_hieu": args.so_ky_hieu,
        "ngay_thang": _default_ngay_thang(),
        "trich_yeu": args.trich_yeu,
        "noi_nhan": args.noi_nhan,
        "nguoi_ky": args.nguoi_ky,
        "chuc_vu_ky": args.chuc_vu_ky,
    }

    render_document(
        template_path=template_path,
        output_path=output_path,
        metadata=metadata,
        blocks=blocks,
    )

    print(f"✅ Render xong: {output_path}")


if __name__ == "__main__":
    main()
