@echo off
setlocal
cd /d "%~dp0"
title Render ke hoach tu clipboard

echo =========================================
echo RENDER KE HOACH TU CLIPBOARD (KHONG DUNG API)
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
    echo [LOI] Khong tim thay render_ke_hoach_clipboard.py
    pause
    exit /b 1
)

if not exist "%~dp0render_ke_hoach_from_txt.py" (
    echo [LOI] Khong tim thay render_ke_hoach_from_txt.py
    pause
    exit /b 1
)

set "OUTPUT_TXT=%~dp0noi_dung_ke_hoach_clipboard.txt"
set "FILE_TAG=clipboard-ai"
if not "%~1"=="" set "FILE_TAG=%~n1"

python "%~dp0render_ke_hoach_clipboard.py" --output-txt "%OUTPUT_TXT%"
if errorlevel 1 (
    echo.
    echo [LOI] Khong doc duoc van ban trong clipboard.
    echo Hay copy toan bo cau tra loi DeepSeek truoc khi chay file nay.
    pause
    exit /b 1
)

echo.
echo [DANG RENDER DOCX...]
python "%~dp0render_ke_hoach_from_txt.py" --input-txt "%OUTPUT_TXT%" --file-tag "%FILE_TAG%"
if errorlevel 1 (
    echo.
    echo [LOI] Tao DOCX that bai.
    pause
    exit /b 1
)

echo.
echo [OK] Da tao DOCX trong thu muc van-ban-di.
echo Cua so se tu dong dong sau 3 giay...
timeout /t 3 >nul
exit /b 0
