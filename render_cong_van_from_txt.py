#!/usr/bin/env python3
"""Chuyển nội dung công văn AI từ TXT thành JSON cho renderer công văn."""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

from render_cong_van import render_cong_van


REQUIRED_FIELDS = ("SỐ KÝ HIỆU", "TRÍCH YẾU", "KÍNH GỬI", "NƠI NHẬN", "NỘI DUNG")
KINH_GUI = (
    "Các tổ chuyên môn, tổ văn phòng;",
    "Giáo viên chủ nhiệm;",
    "Đoàn TNCS HCM trường.",
)
NOI_NHAN_KE_HOACH = (
    "Sở GDĐT Đồng Tháp (báo cáo); "
    "Hiệu trưởng, các Phó Hiệu trưởng; "
    "Các tổ chuyên môn, tổ văn phòng; "
    "Đoàn TNCSHCM; Lưu: VT"
)
CAU_KET_CONG_VAN = (
    "Trường THPT Đốc Binh Kiều đề nghị các tổ chuyên môn, tổ văn phòng, "
    "giáo viên chủ nhiệm và Đoàn TNCSHCM quan tâm, phối hợp thực hiện và "
    "nghiêm túc triển khai thực hiện và báo cáo kịp thời các diễn biến bất "
    "thường về trường để tổng hợp báo cáo Sở GDĐT./."
)


def _clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")
    lines = []
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if line.startswith("```") or line in {"---", "***"}:
            continue
        line = re.sub(r"^\*\*(.+)\*\*$", r"\1", line)
        line = line.replace("**", "").replace("__", "")
        if line:
            lines.append(line)
        elif lines and lines[-1] != "":
            lines.append("")
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def parse_cong_van_text(raw_text: str) -> dict:
    """Đọc định dạng 5 nhãn của prompt_cong_van_web.txt."""
    text = _clean_text(raw_text)
    if text.strip() == "CHƯA ĐỦ DỮ LIỆU SOẠN CÔNG VĂN":
        raise ValueError("DeepSeek báo chưa đủ dữ liệu để soạn công văn.")

    values = {}
    content_lines = []
    in_content = False
    label_pattern = re.compile(
        r"^(SỐ\s*KÝ\s*HIỆU|SO\s*KY\s*HIEU|TRÍCH\s*YẾU|TRICH\s*YEU|"
        r"KÍNH\s*GỬI|KINH\s*GUI|NƠI\s*NHẬN|NOI\s*NHAN|NỘI\s*DUNG|NOI\s*DUNG)\s*:\s*(.*)$",
        re.IGNORECASE,
    )
    normalized_labels = {
        "SỐ KÝ HIỆU": "SỐ KÝ HIỆU", "SO KY HIEU": "SỐ KÝ HIỆU",
        "TRÍCH YẾU": "TRÍCH YẾU", "TRICH YEU": "TRÍCH YẾU",
        "KÍNH GỬI": "KÍNH GỬI", "KINH GUI": "KÍNH GỬI",
        "NƠI NHẬN": "NƠI NHẬN", "NOI NHAN": "NƠI NHẬN",
        "NỘI DUNG": "NỘI DUNG", "NOI DUNG": "NỘI DUNG",
    }

    for line in text.splitlines():
        match = label_pattern.match(line)
        if match and not in_content:
            raw_label = re.sub(r"\s+", " ", match.group(1).upper()).strip()
            label = normalized_labels[raw_label]
            value = match.group(2).strip()
            if label == "NỘI DUNG":
                in_content = True
                if value:
                    content_lines.append(value)
            else:
                values[label] = value
            continue
        if in_content:
            content_lines.append(line)

    values["NỘI DUNG"] = "\n".join(content_lines).strip()
    missing = [field for field in REQUIRED_FIELDS if not values.get(field)]
    if missing:
        raise ValueError("Thiếu hoặc rỗng phần bắt buộc: " + ", ".join(missing))

    content_lines = [
        line for line in values["NỘI DUNG"].splitlines()
        if not re.match(r"^thời\s*gian\s*thực\s*hiện\s*:", line.strip(), re.IGNORECASE)
    ]
    content = "\n".join(content_lines).strip().rstrip()
    content = re.sub(r"nội\s+dung\s+sau\.", "nội dung sau:", content, flags=re.IGNORECASE)
    if content.endswith(CAU_KET_CONG_VAN):
        content = content[:-len(CAU_KET_CONG_VAN)].rstrip()
    content = f"{content}\n{CAU_KET_CONG_VAN}".strip()

    return {
        "loai_van_ban": "cong_van",
        "so_ky_hieu_goi_y": values["SỐ KÝ HIỆU"],
        "trich_yeu": values["TRÍCH YẾU"],
        "kinh_gui": list(KINH_GUI),
        "noi_nhan": NOI_NHAN_KE_HOACH,
        "noi_dung": content,
    }


def _safe_file_tag(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"\s+", "_", text.strip())[:100].rstrip("_")
    return text or "cong_van"


def main() -> None:
    bot_dir = Path(__file__).resolve().parent
    root_dir = bot_dir.parent
    parser = argparse.ArgumentParser(description="Render DOCX CÔNG VĂN từ file TXT nội dung AI")
    parser.add_argument("--input-txt", default=str(bot_dir / "noi_dung_cong_van.txt"))
    parser.add_argument("--input-json", default=str(bot_dir / "noi_dung_cong_van_clipboard.json"))
    parser.add_argument("--output-dir", default=str(root_dir / "van-ban-di"))
    args = parser.parse_args()

    input_path = Path(args.input_txt)
    if not input_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file TXT: {input_path}")

    content = parse_cong_van_text(input_path.read_text(encoding="utf-8-sig"))
    json_path = Path(args.input_json)
    json_path.write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    timestamp = datetime.now().strftime("%Y_%m_%d_%H%M%S")
    output_path = render_cong_van(
        noi_dung_path=json_path,
        output_dir=Path(args.output_dir),
        timestamp=timestamp,
    )
    print(f"✅ Render xong: {output_path}")


if __name__ == "__main__":
    main()