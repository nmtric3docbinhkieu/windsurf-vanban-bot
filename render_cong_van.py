#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Render công văn (memo) từ TEMPLATE_CV.docx.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt
from docxtpl import DocxTemplate

from renderer_engine import (
    _format_noi_nhan_table,
    _normalize_default_header_blank_lines,
    load_style_config,
    parse_content_to_blocks,
    set_font,
    set_paragraph_format,
    validate_blocks,
)


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_JSON = Path(__file__).resolve().parent / "noi_dung_cong_van.json"
DEFAULT_TEMPLATE = Path(__file__).resolve().parent / "TEMPLATE_CV.docx"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "van-ban-di"


def _clear_cell(cell):
    cell.text = ""


def _set_cell_lines(cell, lines, font_size=14, align=WD_ALIGN_PARAGRAPH.LEFT):
    _clear_cell(cell)
    for index, line in enumerate(lines):
        paragraph = cell.paragraphs[0] if index == 0 else cell.add_paragraph()
        paragraph.alignment = align
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(0)
        paragraph.paragraph_format.line_spacing = 1.0
        paragraph.paragraph_format.first_line_indent = Pt(0)
        run = paragraph.add_run(line)
        set_font(run, bold=False, size=font_size)


def _find_table_with_label(doc, label):
    for table in doc.tables:
        try:
            if label in (table.cell(0, 0).text or ""):
                return table
        except Exception:
            continue
    return None


def _render_kinh_gui_table(doc, recipients):
    table = _find_table_with_label(doc, "Kính gửi")
    if table is None:
        return

    while len(table.rows) < max(3, len(recipients) + 1):
        table.add_row()

    _set_cell_lines(table.cell(0, 0), ["Kính gửi:"], font_size=14, align=WD_ALIGN_PARAGRAPH.LEFT)
    _clear_cell(table.cell(0, 1))

    for row_index, recipient in enumerate(recipients, start=1):
        _clear_cell(table.cell(row_index, 0))
        _set_cell_lines(table.cell(row_index, 1), [recipient], font_size=14, align=WD_ALIGN_PARAGRAPH.LEFT)

    for row_index in range(len(recipients) + 1, len(table.rows)):
        _clear_cell(table.cell(row_index, 0))
        _clear_cell(table.cell(row_index, 1))


def _insert_blocks(doc, blocks):
    anchor_index = -1
    for index, paragraph in enumerate(doc.paragraphs):
        if "{{noi_dung}}" in (paragraph.text or ""):
            anchor_index = index
            break

    if anchor_index == -1:
        for index, paragraph in enumerate(doc.paragraphs):
            if (paragraph.text or "").strip() == "":
                anchor_index = index
                break

    if anchor_index == -1:
        anchor_index = len(doc.paragraphs) - 1

    body = doc._body._body
    body_children = list(body.iterchildren())
    anchor_element = doc.paragraphs[anchor_index]._element
    anchor_body_index = body_children.index(anchor_element)

    trailing_elements = []
    for element in body_children[anchor_body_index + 1:]:
        if element.tag.endswith("sectPr"):
            continue
        trailing_elements.append(element)

    for element in trailing_elements:
        element.getparent().remove(element)
    anchor_element.getparent().remove(anchor_element)

    style_config = load_style_config()
    styles = style_config.get("styles", {})

    for block in blocks:
        block_type = block["type"]
        block_style = styles.get(block_type, styles.get("paragraph", {}))
        paragraph = doc.add_paragraph()
        run = paragraph.add_run(block["text"])
        set_paragraph_format(paragraph, block_type, style_config)
        set_font(run, bold=block_style.get("bold", False), size=14 if block_type in {"paragraph", "bullet", "heading1"} else block_style.get("font_size", 13), style_config=style_config)

    sect_pr = None
    for element in body.iterchildren():
        if element.tag.endswith("sectPr"):
            sect_pr = element
            break

    if trailing_elements and (not doc.paragraphs or doc.paragraphs[-1].text.strip() != ""):
        doc.add_paragraph("")

    for element in trailing_elements:
        if sect_pr is not None:
            body.insert(body.index(sect_pr), element)
        else:
            body.append(element)


def _format_cong_van_header(doc, so_ky_hieu, trich_yeu):
    if not doc.tables:
        return

    header_table = doc.tables[0]
    if len(header_table.rows) < 2 or len(header_table.columns) < 2:
        return

    _set_cell_lines(
        header_table.cell(1, 0),
        [f"Số: {so_ky_hieu}", trich_yeu],
        font_size=12,
        align=WD_ALIGN_PARAGRAPH.CENTER,
    )
    _set_cell_lines(
        header_table.cell(1, 1),
        [f"Đồng Tháp, {datetime.now().day} tháng {datetime.now().month} năm {datetime.now().year}"],
        font_size=12,
        align=WD_ALIGN_PARAGRAPH.CENTER,
    )

    if len(header_table.rows) > 2:
        _clear_cell(header_table.cell(2, 0))
        _clear_cell(header_table.cell(2, 1))


def _load_content_source(noi_dung_path):
    with open(noi_dung_path, "r", encoding="utf-8") as f:
        return json.load(f)


def render_cong_van(noi_dung_path=DEFAULT_INPUT_JSON, output_dir=DEFAULT_OUTPUT_DIR, timestamp=None):
    """Render công văn từ JSON content."""

    noi_dung = _load_content_source(noi_dung_path)

    required_fields = ["loai_van_ban", "so_ky_hieu_goi_y", "trich_yeu", "noi_dung"]
    for field in required_fields:
        if field not in noi_dung:
            raise ValueError(f"Missing required field: {field}")

    if noi_dung.get("loai_van_ban") != "cong_van":
        raise ValueError(f"Expected loai_van_ban='cong_van', got '{noi_dung.get('loai_van_ban')}'")

    blocks = parse_content_to_blocks(noi_dung.get("noi_dung", ""))
    errors = validate_blocks(blocks)
    if errors:
        raise ValueError("Block validation failed:\n" + "\n".join(errors))

    if timestamp is None:
        timestamp = datetime.now().strftime("%Y_%m_%d_%H%M%S")

    so_ky_hieu = noi_dung.get("so_ky_hieu_goi_y", "").replace("/", "_").replace(" ", "").strip("_")
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"VBDi_{so_ky_hieu}_CV_{timestamp}.docx"

    template_path = Path(DEFAULT_TEMPLATE)
    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_path}")

    metadata = {
        "so_ky_hieu": noi_dung.get("so_ky_hieu_goi_y", ""),
        "trich_yeu": noi_dung.get("trich_yeu", ""),
        "noi_nhan": noi_dung.get("noi_nhan", ""),
        "kinh_gui": noi_dung.get("kinh_gui", []),
        "ngay_thang": f"Ngày {datetime.now().day} tháng {datetime.now().month} năm {datetime.now().year}",
    }

    doc_tpl = DocxTemplate(template_path)
    doc_tpl.render({
        "so_ky_hieu": metadata["so_ky_hieu"],
        "trich_yeu": metadata["trich_yeu"],
        "noi_nhan": metadata["noi_nhan"],
        "kinh_gui": metadata["kinh_gui"],
        "ngay_thang": metadata["ngay_thang"],
        "noi_dung": "",
    })

    temp_path = output_dir / f"temp_{output_path.name}"
    doc_tpl.save(temp_path)

    doc = Document(temp_path)
    _insert_blocks(doc, blocks)
    _format_cong_van_header(doc, metadata["so_ky_hieu"], metadata["trich_yeu"])
    _render_kinh_gui_table(doc, metadata["kinh_gui"])
    _format_noi_nhan_table(doc, metadata["noi_nhan"])
    _normalize_default_header_blank_lines(doc)
    doc.save(output_path)
    temp_path.unlink(missing_ok=True)

    print(f"✅ Đã render {len(blocks)} blocks vào: {output_path}")
    return output_path


if __name__ == "__main__":
    try:
        output_path = render_cong_van()
        print(f"\n✅ SUCCESS: {output_path}")
    except Exception as exc:
        print(f"\n❌ ERROR: {exc}")
        raise