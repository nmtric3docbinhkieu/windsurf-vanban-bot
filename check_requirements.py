#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Kiểm tra các yêu cầu cần thiết cho dự án"""

import sys
import os

print("=" * 60)
print("KIỂM TRA YÊU CẦU CẦN THIẾT - VANBAN-BOT PROJECT")
print("=" * 60)

# Kiểm tra Python
print(f"\n✓ Python: {sys.version}")
print(f"✓ Python executable: {sys.executable}")

# Kiểm tra các thư viện Python
print("\n--- Kiểm tra Python Packages ---")
packages = ['openai', 'docx', 'docxtpl', 'dotenv']
missing_packages = []

for pkg in packages:
    try:
        __import__(pkg)
        print(f"✓ {pkg}: Đã cài đặt")
    except ImportError:
        print(f"✗ {pkg}: THIẾU")
        missing_packages.append(pkg)

# Kiểm tra các file cấu hình
print("\n--- Kiểm tra File Cấu Hình ---")
config_files = [
    'requirements.txt',
    'package.json',
    'package-lock.json',
    'style_config.json',
    'TEMPLATE.docx',
    'TEMPLATE_CV.docx',
    '.env.example'
]

for file in config_files:
    path = os.path.join(os.getcwd(), file)
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"✓ {file}: Có ({size} bytes)")
    else:
        print(f"✗ {file}: THIẾU")

# Kiểm tra các thư mục
print("\n--- Kiểm tra Thư Mục ---")
dirs = ['crawler', 'tools', 'tests', 'docs', 'examples', 'state', 'integrations', 'node_modules']
for dir_name in dirs:
    path = os.path.join(os.getcwd(), dir_name)
    if os.path.isdir(path):
        file_count = len(os.listdir(path))
        print(f"✓ {dir_name}/: Có ({file_count} items)")
    else:
        print(f"✗ {dir_name}/: THIẾU")

# Kiểm tra các file script chính
print("\n--- Kiểm tra File Script Chính ---")
scripts = [
    'run_ke_hoach.py',
    'soan_van_ban_di.py',
    'render_ke_hoach.py',
    'renderer_engine.py'
]

for script in scripts:
    path = os.path.join(os.getcwd(), script)
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"✓ {script}: Có ({size} bytes)")
    else:
        print(f"✗ {script}: THIẾU")

print("\n" + "=" * 60)
if missing_packages:
    print(f"\n⚠ CẦN CÀI ĐẶT CÁC PACKAGE: {', '.join(missing_packages)}")
    print(f"\nChạy lệnh: pip install {' '.join(missing_packages)}")
else:
    print("\n✓ TẤT CẢ YÊU CẦU ĐÃ ĐƯỢC THỎa MÃN!")

print("=" * 60)
