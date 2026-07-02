@echo off
REM ============================================================================
REM SCRIPT CÀI ĐẶT PYTHON DEPENDENCIES CHO VANBAN-BOT
REM ============================================================================
REM
REM Tác vụ: Cài đặt tất cả Python packages từ requirements.txt
REM Tiên quyết: Python phải được cài đặt và PATH được cấu hình
REM
REM ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================================================
echo VANBAN-BOT - CÀI ĐẶT PYTHON DEPENDENCIES
echo ============================================================================
echo.

REM Kiểm tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python không được tìm thấy!
    echo Vui lòng cài đặt Python hoặc thêm vào PATH
    echo.
    pause
    exit /b 1
)

echo ✓ Python tìm thấy:
python --version
echo.

REM Kiểm tra pip
pip --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: pip không khả dụng
    echo Thử cài đặt pip...
    python -m ensurepip --upgrade
)

echo.
echo ============================================================================
echo CÀI ĐẶT PACKAGES TỪ requirements.txt
echo ============================================================================
echo.

pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Cài đặt không thành công!
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo KIỂM TRA CÀI ĐẶT
echo ============================================================================
echo.

python -c "
try:
    import openai
    print('✓ openai: OK')
except ImportError:
    print('✗ openai: FAILED')

try:
    import docx
    print('✓ python-docx: OK')
except ImportError:
    print('✗ python-docx: FAILED')

try:
    import docxtpl
    print('✓ docxtpl: OK')
except ImportError:
    print('✗ docxtpl: FAILED')

try:
    import dotenv
    print('✓ python-dotenv: OK')
except ImportError:
    print('✗ python-dotenv: FAILED')
"

echo.
echo ============================================================================
echo CÀI ĐẶT HOÀN TẤT!
echo ============================================================================
echo.
echo Bước tiếp theo:
echo 1. Cấu hình .env file (copy từ .env.example)
echo 2. Chạy script: python run_ke_hoach.py
echo.
pause
