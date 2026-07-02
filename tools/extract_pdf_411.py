#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
from pathlib import Path

from pdf2image import convert_from_path
import pytesseract


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    default_pdf = project_root / "van-ban-den-xu-ly" / "KH411-TC-GIAI-TTHS_NH25-26.pdf"
    default_output = project_root / "van-ban-den-xu-ly" / "KH411_extracted.txt"

    parser = argparse.ArgumentParser(description="OCR file PDF 411 sang TXT")
    parser.add_argument("pdf_path", nargs="?", default=str(default_pdf))
    parser.add_argument("--output", default=str(default_output))
    args = parser.parse_args()

    images = convert_from_path(args.pdf_path)

    full_text = ""
    for i, img in enumerate(images):
        text = pytesseract.image_to_string(img, lang='vie')
        full_text += f"\n--- PAGE {i+1} ---\n{text}"
        print(f"Extracted page {i+1}: {len(text)} chars")

    print(f"\nTOTAL TEXT: {len(full_text)} characters")

    output_path = Path(args.output)
    output_path.write_text(full_text, encoding='utf-8')
    print(f"Saved to: {output_path}")

    print("\n=== CONTENT PREVIEW ===")
    print(full_text[:3000])


if __name__ == "__main__":
    main()
