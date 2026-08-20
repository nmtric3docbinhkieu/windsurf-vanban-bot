@echo off
setlocal
cd /d "%~dp0"
title Render cong van tu clipboard

echo =========================================
echo RENDER CONG VAN TU CLIPBOARD (KHONG DUNG API)
echo =========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [LOI] Windows khong tim thay Python.
    echo Hay chay SETUP_ENV.bat hoac cai Python roi chay lai.
    pause
    exit /b 1
)

if not exist "%~dp0render_ke_hoach_clipboard.py" (
    echo [LOI] Khong tim thay script doc clipboard.
    pause
    exit /b 1
)

if not exist "%~dp0render_cong_van_from_txt.py" (
    echo [LOI] Khong tim thay render_cong_van_from_txt.py
    pause
    exit /b 1
)

if not exist "%~dp0TEMPLATE_CV.docx" (
    echo [LOI] Khong tim thay TEMPLATE_CV.docx
    pause
    exit /b 1
)

set "OUTPUT_TXT=%~dp0noi_dung_cong_van_clipboard.txt"

python "%~dp0render_ke_hoach_clipboard.py" --output-txt "%OUTPUT_TXT%"
if errorlevel 1 (
    echo.
    echo [LOI] Khong doc duoc van ban trong clipboard.
    echo Hay copy toan bo cau tra loi DeepSeek truoc khi chay file nay.
    pause
    exit /b 1
)

echo.
echo [DANG KIEM TRA NOI DUNG VA RENDER DOCX...]
python "%~dp0render_cong_van_from_txt.py" --input-txt "%OUTPUT_TXT%"
if errorlevel 1 (
    echo.
    echo [LOI] Tao DOCX that bai.
    echo Kiem tra DeepSeek da tra dung 5 nhan: SO KY HIEU, TRICH YEU, KINH GUI, NOI NHAN, NOI DUNG.
    pause
    exit /b 1
)

echo.
echo [OK] Da tao DOCX trong thu muc van-ban-di.
pause