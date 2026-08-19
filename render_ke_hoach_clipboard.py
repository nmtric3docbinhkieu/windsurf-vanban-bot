#!/usr/bin/env python3
"""Luu noi dung van ban tu clipboard va render ke hoach khong dung API."""

import argparse
import re
import tkinter as tk
from datetime import datetime
from pathlib import Path


def read_clipboard() -> str:
    root = tk.Tk()
    root.withdraw()
    try:
        return root.clipboard_get()
    finally:
        root.destroy()


def clean_clipboard_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")
    lines = []
    in_code_block = False
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if line.startswith("```"):
            in_code_block = not in_code_block
            continue
        if line.startswith("---") or line.startswith("***"):
            continue
        line = re.sub(r"^\*\*(.+)\**$", r"\1", line)
        line = line.replace("**", "").replace("__", "")
        line = re.sub(r"^[-*]\s+", "", line)
        if line:
            lines.append(line)
        elif lines and lines[-1] != "":
            lines.append("")
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines).strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-txt", default="noi_dung_ke_hoach_clipboard.txt")
    args = parser.parse_args()

    text = clean_clipboard_text(read_clipboard())
    if not text:
        raise SystemExit("Clipboard dang rong hoac khong co van ban.")

    output_path = Path(args.output_txt)
    output_path.write_text(text + "\n", encoding="utf-8-sig")
    print(f"Da luu TXT UTF-8: {output_path}")


if __name__ == "__main__":
    main()
