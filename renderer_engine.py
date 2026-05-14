#!/usr/bin/env python3
"""
Word Rendering Engine - Module độc lập

Kiến trúc:
- AI Parser → structured blocks (content)
- Renderer Engine → Word paragraphs (presentation)
- Template → header/footer/logo (format)
- Style Config → styling rules (configurable)

API:
    render_document(template_path, output_path, metadata, blocks, style_config_path=None)

Block Schema Version: 1.0
"""

import re
import json
from typing import List, Dict, Optional
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docxtpl import DocxTemplate
from pathlib import Path

# Block Schema Version - freeze for backward compatibility
BLOCK_SCHEMA_VERSION = "1.0"

# Block Registry - mapping block types to renderers
# This pattern avoids if/else spaghetti and allows easy extension
BLOCK_RENDERERS = {
    "heading1": None,  # Will be set after function definitions
    "heading2": None,
    "heading3": None,
    "paragraph": None,
    "bullet": None,
}

def register_block_renderer(block_type: str):
    """
    Decorator to register a block renderer
    
    Args:
        block_type: Type of block (heading1, heading2, etc.)
    """
    def decorator(func):
        BLOCK_RENDERERS[block_type] = func
        return func
    return decorator

def load_style_config(config_path: Optional[Path] = None) -> Dict:
    """
    Load style config từ file JSON
    
    Args:
        config_path: Đường dẫn file config (nếu None, dùng config mặc định)
    
    Returns:
        Dict với style config
    """
    if config_path is None:
        config_path = Path(__file__).parent / "style_config.json"
    
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        # Config mặc định
        return {
            "styles": {
                "heading1": {"bold": True, "font_size": 14, "indent_cm": 0},
                "heading2": {"bold": True, "font_size": 13, "indent_cm": 1.0},
                "heading3": {"bold": False, "font_size": 13, "indent_cm": 1.5},
                "paragraph": {"bold": False, "font_size": 13, "indent_cm": 1.25},
                "bullet": {"bold": False, "font_size": 13, "indent_cm": 1.25}
            },
            "font": {"name": "Times New Roman", "vietnamese_support": True},
            "paragraph": {"alignment": "justify"}
        }

def validate_blocks(blocks: List[Dict]) -> List[str]:
    """
    Validate structured blocks against schema
    
    Args:
        blocks: List of blocks to validate
    
    Returns:
        List of validation errors (empty if valid)
    
    Checks:
        - Missing required fields
        - Invalid block types
        - Invalid metadata
    """
    errors = []
    valid_types = {"heading1", "heading2", "heading3", "paragraph", "bullet"}
    
    for i, block in enumerate(blocks):
        # Check required fields
        if "type" not in block:
            errors.append(f"Block {i}: Missing 'type' field")
            continue
        
        if "text" not in block:
            errors.append(f"Block {i}: Missing 'text' field")
            continue
        
        # Check block type
        if block["type"] not in valid_types:
            errors.append(f"Block {i}: Invalid type '{block['type']}'. Valid types: {valid_types}")
        
        # Check metadata
        if "meta" not in block:
            errors.append(f"Block {i}: Missing 'meta' field")
        elif not isinstance(block["meta"], dict):
            errors.append(f"Block {i}: 'meta' must be a dict")
    
    return errors

def parse_content_to_blocks(content: str) -> List[Dict]:
    """
    Parse nội dung text thành structured blocks với metadata
    
    Args:
        content: Nội dung text từ AI
    
    Returns:
        List of blocks với schema chuẩn:
        {
            "type": "heading1|heading2|heading3|paragraph|bullet",
            "text": "nội dung",
            "meta": {
                "numbering": true/false,
                "indent": true/false,
                ... (future extensibility)
            }
        }
    """
    lines = content.split('\n')
    blocks = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Heading level 1: I, II, III, IV, V...
        if re.match(r'^[IVXLCDM]+\.', line):
            blocks.append({
                'type': 'heading1',
                'text': line,
                'meta': {
                    'numbering': True,
                    'indent': False
                }
            })
        # Heading level 2: 1, 2, 3...
        elif re.match(r'^\d+\.', line):
            blocks.append({
                'type': 'heading2',
                'text': line,
                'meta': {
                    'numbering': True,
                    'indent': True
                }
            })
        # Heading level 3: a, b, c...
        elif re.match(r'^[a-z]+\.', line):
            blocks.append({
                'type': 'heading3',
                'text': line,
                'meta': {
                    'numbering': True,
                    'indent': True
                }
            })
        # Bullet
        elif line.startswith('• '):
            blocks.append({
                'type': 'bullet',
                'text': line,
                'meta': {
                    'numbering': True,
                    'indent': True
                }
            })
        # Normal paragraph
        else:
            blocks.append({
                'type': 'paragraph',
                'text': line,
                'meta': {
                    'numbering': False,
                    'indent': True
                }
            })
    
    return blocks

def set_font(run, bold=False, size=13, style_config=None):
    """
    Set font cho run dựa trên style config
    
    Args:
        run: Run object
        bold: Bold flag
        size: Font size in points
        style_config: Style config dict (nếu None, dùng mặc định)
    """
    if style_config is None:
        style_config = load_style_config()
    
    font_config = style_config.get('font', {})
    font_name = font_config.get('name', 'Times New Roman')
    
    run.font.name = font_name
    run.font.size = Pt(size)
    run.font.bold = bold
    
    # Set font tiếng Việt nếu config yêu cầu
    if font_config.get('vietnamese_support', True):
        r = run._r
        rPr = r.get_or_add_rPr()
        rFonts = OxmlElement('w:rFonts')
        rFonts.set(qn('w:ascii'), font_name)
        rFonts.set(qn('w:hAnsi'), font_name)
        rFonts.set(qn('w:eastAsia'), font_name)
        rPr.append(rFonts)

def set_paragraph_format(para, block_type='paragraph', style_config=None):
    """
    Set format cho paragraph dựa trên style config
    
    Args:
        para: Paragraph object
        block_type: Type của block (heading1, heading2, heading3, paragraph, bullet)
        style_config: Style config dict (nếu None, dùng mặc định)
    """
    if style_config is None:
        style_config = load_style_config()
    
    # Get style cho block type
    styles = style_config.get('styles', {})
    block_style = styles.get(block_type, styles.get('paragraph', {}))
    
    # Set alignment
    para_config = style_config.get('paragraph', {})
    alignment = para_config.get('alignment', 'justify')
    if alignment == 'justify':
        para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    elif alignment == 'center':
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif alignment == 'left':
        para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    
    # Set line spacing
    # - value <= 3: line multiple/single spacing
    # - value > 3: exact point spacing
    line_spacing = block_style.get('line_spacing', 1.0)
    if isinstance(line_spacing, (int, float)) and line_spacing <= 3:
        para.paragraph_format.line_spacing = line_spacing
    else:
        para.paragraph_format.line_spacing = Pt(line_spacing)
    
    # Set spacing after
    spacing_after = block_style.get('spacing_after', 3)
    para.paragraph_format.space_after = Pt(spacing_after)
    
    # Set spacing before
    spacing_before = block_style.get('spacing_before', 0)
    if spacing_before > 0:
        para.paragraph_format.space_before = Pt(spacing_before)
    
    # Set thụt đầu dòng (sử dụng Inches để chính xác hơn)
    indent_cm = block_style.get('indent_cm', 0)
    para.paragraph_format.first_line_indent = Inches(indent_cm / 2.54)  # Convert cm to inches

def insert_paragraph_at_position(doc, position, text, block_type):
    """
    Insert paragraph tại vị trí cụ thể trong document
    
    Args:
        doc: Document object
        position: Index của paragraph để insert sau đó
        text: Nội dung text
        block_type: Type của block (heading1, heading2, heading3, paragraph, bullet)
    
    Returns:
        Paragraph object đã được tạo
    """
    # Lấy paragraph tại vị trí
    target_para = doc.paragraphs[position]
    
    # Tạo paragraph mới
    new_para = target_para.insert_paragraph_before(text)
    
    # Clear runs để apply style mới
    new_para.clear()
    
    # Tạo run mới với text
    run = new_para.add_run(text)
    
    # Apply style theo type
    if block_type == 'heading1':
        set_paragraph_format(new_para, indent_level=0)
        set_font(run, bold=True, size=14)
    elif block_type == 'heading2':
        set_paragraph_format(new_para, indent_level=1)
        set_font(run, bold=True, size=13)
    elif block_type == 'heading3':
        set_paragraph_format(new_para, indent_level=2)
        set_font(run, bold=False, size=13)
    elif block_type == 'bullet':
        set_paragraph_format(new_para, indent_level=3)
        set_font(run, bold=False, size=13)
    else:  # paragraph
        set_paragraph_format(new_para, indent_level=3)
        set_font(run, bold=False, size=13)
    
    return new_para

def render_document(template_path: Path, output_path: Path, metadata: Dict, blocks: List[Dict], style_config_path: Optional[Path] = None) -> None:
    """
    API chính: Render structured blocks vào template
    
    Args:
        template_path: File template có placeholder
        output_path: File output
        metadata: Dict với các placeholder (so_ky_hieu, ngay_thang, trich_yeu, noi_nhan, nguoi_ky, chuc_vu_ky)
        blocks: List of structured blocks từ AI parser
        style_config_path: Đường dẫn file style config (nếu None, dùng config mặc định)
    
    Kiến trúc:
        AI Parser → blocks (content)
        Validation Layer → schema check
        Renderer Engine → Word paragraphs (presentation)
        Template → header/footer (format)
        Style Config → styling rules (configurable)
    """
    # Validate blocks before rendering
    validation_errors = validate_blocks(blocks)
    if validation_errors:
        raise ValueError(f"Block validation failed:\n" + "\n".join(validation_errors))
    
    # Load style config
    style_config = load_style_config(style_config_path)
    
    # Bước 1: Render metadata placeholder bằng docxtpl (trừ noi_dung)
    doc_tpl = DocxTemplate(template_path)
    
    data = {
        'loai_van_ban': metadata.get('loai_van_ban', 'KẾ HOẠCH'),
        'so_ky_hieu': metadata.get('so_ky_hieu', ''),
        'ngay_thang': metadata.get('ngay_thang', ''),
        'trich_yeu': metadata.get('trich_yeu', ''),
        'noi_dung': '',  # Để trống, sẽ render blocks sau
        'noi_nhan': metadata.get('noi_nhan', ''),
        'nguoi_ky': metadata.get('nguoi_ky', ''),
        'chuc_vu_ky': metadata.get('chuc_vu_ky', '')
    }
    
    doc_tpl.render(data)
    
    # Save temp file
    temp_path = output_path.parent / f"temp_{output_path.name}"
    doc_tpl.save(temp_path)
    
    # Bước 2: Mở bằng python-docx, tìm anchor, insert structured paragraphs
    doc = Document(temp_path)
    
    # Tìm đúng paragraph chứa {{noi_dung}} trước.
    # Chỉ fallback sang dòng trống khi template thực sự không có placeholder này.
    anchor_index = -1
    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        if '{{noi_dung}}' in text:
            anchor_index = i
            break

    if anchor_index == -1:
        for i, para in enumerate(doc.paragraphs):
            text = para.text.strip()
            if text == '':
                anchor_index = i
                break
    
    if anchor_index == -1:
        print("⚠️  Không tìm thấy anchor {{noi_dung}}")
        # Nếu không tìm thấy, insert ở cuối
        anchor_index = len(doc.paragraphs) - 1
    
    # Lưu toàn bộ phần tử phía sau anchor trong body (paragraph, table, ...)
    # để có thể chèn lại đúng thứ tự ở cuối tài liệu.
    body = doc._body._body
    body_children = list(body.iterchildren())
    anchor_element = doc.paragraphs[anchor_index]._element
    anchor_body_index = body_children.index(anchor_element)

    trailing_elements = []
    for element in body_children[anchor_body_index + 1:]:
        if element.tag.endswith('sectPr'):
            continue
        trailing_elements.append(element)

    # Xóa anchor placeholder và các phần tử phía sau nó khỏi vị trí hiện tại.
    for element in trailing_elements:
        element.getparent().remove(element)
    anchor_element.getparent().remove(anchor_element)
    
    # Add structured paragraphs với styling từ config
    styles = style_config.get('styles', {})
    for block in blocks:
        block_type = block['type']
        block_style = styles.get(block_type, styles.get('paragraph', {}))
        
        p = doc.add_paragraph(block['text'])
        # Clear và add run mới để styling
        p.clear()
        run = p.add_run(block['text'])
        
        # Apply style từ config
        set_paragraph_format(p, block_type, style_config)
        set_font(run, bold=block_style.get('bold', False), size=block_style.get('font_size', 13), style_config=style_config)
    
    # Add lại các phần tử cuối tài liệu (ví dụ: bảng Nơi nhận - Ký tên)
    sect_pr = None
    for element in body.iterchildren():
        if element.tag.endswith('sectPr'):
            sect_pr = element
            break

    for element in trailing_elements:
        if sect_pr is not None:
            body.insert(body.index(sect_pr), element)
        else:
            body.append(element)
    
    # Save output
    doc.save(output_path)
    
    # Xóa temp file
    temp_path.unlink()
    
    print(f"✅ Đã render {len(blocks)} blocks vào: {output_path}")

def clean_content(content: str) -> str:
    """
    Lọc bỏ tiêu đề và footer từ nội dung AI
    
    Args:
        content: Nội dung thô từ AI
    
    Returns:
        Nội dung đã làm sạch
    """
    lines = content.split('\n')
    
    # Bỏ dòng đầu tiên nếu là loại văn bản
    if lines and lines[0].strip().upper() in ["KẾ HOẠCH", "QUYẾT ĐỊNH", "BÁO CÁO", "TỜ TRÌNH", "BIÊN BẢN", "CÔNG VĂN"]:
        lines = lines[1:]
    
    # Bỏ dòng thứ hai nếu là trích yếu
    if lines and lines[0].strip():
        lines = lines[1:]
    
    # Bỏ dòng trống tiếp theo
    if lines and not lines[0].strip():
        lines = lines[1:]
    
    # Lọc nội dung chính, bỏ footer
    result = []
    for line in lines:
        line = line.strip()
        
        # Tìm dấu hiệu footer
        if "Nơi nhận:" in line or re.match(r"^[^,]+,\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d+", line, re.IGNORECASE):
            break
        
        # Loại bỏ "./." ở cuối
        line = line.replace("./.", "").strip()
        
        if line:
            result.append(line)
        else:
            result.append('')
    
    return '\n'.join(result)

def test():
    """Test renderer engine với API mới"""
    template_path = Path(__file__).parent / "TEMPLATE.docx"
    content_file = Path(__file__).parent / "noi_dung_ke_hoach.txt"
    output_path = Path(__file__).parent.parent / "van-ban-di" / "test_renderer_final.docx"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Bước 1: Đọc và clean nội dung (AI Parser layer)
    content = content_file.read_text(encoding='utf-8')
    content = clean_content(content)
    
    # Bước 2: Parse thành structured blocks (AI Parser layer)
    blocks = parse_content_to_blocks(content)
    
    # Bước 3: Chuẩn bị metadata
    metadata = {
        'loai_van_ban': 'KẾ HOẠCH',
        'so_ky_hieu': '123/KH-THPTĐBK',
        'ngay_thang': 'Đốc Bình Kiều, ngày 10 tháng 5 năm 2026',
        'trich_yeu': 'Triển khai thực hiện Chỉ thị số 03/CT-TTg về ngăn chặn bạo lực học đường',
        'noi_nhan': 'Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT',
        'nguoi_ky': 'Nguyễn Minh Trí',
        'chuc_vu_ky': 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG'
    }
    
    # Bước 4: Render với API mới (Renderer Engine layer)
    render_document(template_path, output_path, metadata, blocks)
    
    # Print blocks để kiểm tra
    print(f"\n=== PARSED {len(blocks)} BLOCKS ===")
    for i, block in enumerate(blocks[:10]):  # Hiện 10 blocks đầu
        print(f"{i:2d}: [{block['type']:12s}] {block['text'][:60]}...")

if __name__ == "__main__":
    test()
