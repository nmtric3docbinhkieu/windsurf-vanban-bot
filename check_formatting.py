#!/usr/bin/env python3
"""Kiểm tra formatting (bold, indent) của từng paragraph"""

from docx import Document
from pathlib import Path

output_file = Path(__file__).parent.parent / "van-ban-di" / "test_renderer_v4.docx"
doc = Document(output_file)

print("=== KIỂM TRA FORMATTING ===")
for i, para in enumerate(doc.paragraphs):
    text = para.text.strip()
    if not text or i < 5:  # Bỏ qua header và dòng trống
        continue
    
    # Check bold
    bold = any(run.bold for run in para.runs if run.bold)
    
    # Check font size
    font_sizes = [run.font.size for run in para.runs if run.font.size]
    font_size = font_sizes[0] if font_sizes else None
    
    # Check indent
    first_line_indent = para.paragraph_format.first_line_indent
    
    print(f"{i:2d}: [{text[:50]:50s}] Bold={bold} Size={font_size} Indent={first_line_indent}")
    
    if i > 20:  # Chỉ check 20 paragraph đầu
        break
