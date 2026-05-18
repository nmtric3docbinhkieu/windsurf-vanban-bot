#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pdf2image import convert_from_path
import pytesseract
import os

pdf_path = r'd:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\van-ban-den-xu-ly\KH411-TC-GIAI-TTHS_NH25-26.pdf'
images = convert_from_path(pdf_path)

# Extract all pages
full_text = ""
for i, img in enumerate(images):
    text = pytesseract.image_to_string(img, lang='vie')
    full_text += f"\n--- PAGE {i+1} ---\n{text}"
    print(f"Extracted page {i+1}: {len(text)} chars")

print(f"\nTOTAL TEXT: {len(full_text)} characters")

# Save to temp file
output_path = r'd:\OneDrive 2\OneDrive - moet.edu.vn\DuAn_VanBan_TruongDBK\van-ban-den-xu-ly\KH411_extracted.txt'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(full_text)
print(f"Saved to: {output_path}")

# Display first part
print("\n=== CONTENT PREVIEW ===")
print(full_text[:3000])
