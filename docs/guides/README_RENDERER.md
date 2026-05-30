# Word Rendering Engine

## Kiến trúc

```
AI Output
    ↓
AI Parser (parse_content_to_blocks)
    ↓
Structured Blocks (JSON-like)
    ↓
Renderer Engine (render_document)
    ↓
Style Config (style_config.json)
    ↓
Word Template (TEMPLATE.docx)
    ↓
DOCX Output
```

## Nguyên tắc thiết kế

**AI = CONTENT, ENGINE = PRESENTATION**

- AI chỉ sinh nội dung (structured blocks)
- Renderer quyết định styling (bold, indent, spacing)
- Style config cho phép thay đổi style mà không cần sửa code
- Template giữ nguyên header/footer/logo

## API

### render_document

```python
from renderer_engine import render_document, parse_content_to_blocks

# Parse nội dung AI thành structured blocks
blocks = parse_content_to_blocks(content)

# Render vào template
render_document(
    template_path=Path("TEMPLATE.docx"),
    output_path=Path("output.docx"),
    metadata={
        'loai_van_ban': 'KẾ HOẠCH',
        'so_ky_hieu': '123/KH-THPTĐBK',
        'ngay_thang': 'Đốc Bình Kiều, ngày 10 tháng 5 năm 2026',
        'trich_yeu': 'Trích yếu...',
        'noi_nhan': 'Nơi nhận...',
        'nguoi_ky': 'Người ký',
        'chuc_vu_ky': 'Chức vụ'
    },
    blocks=blocks,
    style_config_path=Path("style_config.json")  # Optional
)
```

## Structured Blocks

AI output nên là structured blocks:

```python
[
    {
        "type": "heading1",
        "text": "I. MỤC ĐÍCH, YÊU CẦU"
    },
    {
        "type": "paragraph",
        "text": "Cụ thể hóa các nhiệm vụ..."
    },
    {
        "type": "heading2",
        "text": "1. Đối với Ban Giám hiệu"
    },
    {
        "type": "paragraph",
        "text": "Nhận thức sâu sắc..."
    }
]
```

Block types:
- `heading1`: I, II, III, IV, V...
- `heading2`: 1, 2, 3...
- `heading3`: a, b, c...
- `paragraph`: Normal text
- `bullet`: Bullet points

## Style Config

File `style_config.json`:

```json
{
  "styles": {
    "heading1": {
      "bold": true,
      "font_size": 14,
      "indent_cm": 0,
      "spacing_before": 6,
      "spacing_after": 3,
      "line_spacing": 18
    },
    "heading2": {
      "bold": true,
      "font_size": 13,
      "indent_cm": 1.0,
      "spacing_before": 3,
      "spacing_after": 3,
      "line_spacing": 18
    },
    "paragraph": {
      "bold": false,
      "font_size": 13,
      "indent_cm": 1.25,
      "spacing_before": 0,
      "spacing_after": 3,
      "line_spacing": 18
    }
  },
  "font": {
    "name": "Times New Roman",
    "vietnamese_support": true
  },
  "paragraph": {
    "alignment": "justify"
  }
}
```

## Lợi ích của kiến trúc này

1. **Tách biệt AI và Presentation**: AI chỉ lo nội dung, không cần biết về DOCX formatting
2. **Configurable**: Thay đổi style bằng JSON, không cần sửa code
3. **Reusable**: Cùng engine có thể dùng cho nhiều loại văn bản khác nhau
4. **Maintainable**: Logic styling tập trung ở một chỗ
5. **Testable**: Có thể test riêng parser và renderer

## Tích hợp vào workflow

Trong `soan_van_ban_di.py`:

```python
from renderer_engine import render_document, parse_content_to_blocks, clean_content

# Sau khi AI trả về content
content_clean = clean_content(ai_response['NOI_DUNG'])
blocks = parse_content_to_blocks(content_clean)

metadata = {
    'loai_van_ban': ai_response['LOAI_VAN_BAN'],
    'so_ky_hieu': ai_response['SO_KY_HIEU'],
    'ngay_thang': ai_response['NGAY_THANG'],
    'trich_yeu': ai_response['TRICH_YEU'],
    'noi_nhan': ai_response['NOI_NHAN'],
    'nguoi_ky': ai_response['NGUOI_KY'],
    'chuc_vu_ky': ai_response['CHUC_VU_KY']
}

render_document(template_path, output_path, metadata, blocks)
```

## Tính năng hiện tại

- ✅ Parse nội dung thành structured blocks
- ✅ Render metadata placeholders bằng docxtpl
- ✅ Insert paragraph thật tại anchor position
- ✅ Apply styling từ config (bold, indent, font size, spacing)
- ✅ Hỗ trợ font tiếng Việt
- ✅ Giữ nguyên header/footer từ template

## Tính năng kế hoạch

- ⏳ Numbering thật cho headings
- ⏳ Bullet list support
- ⏳ Table support
- ⏳ Auto TOC
- ⏳ Section/page break
- ⏳ Vietnamese official formatting rules
