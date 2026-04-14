@echo off
chcp 65001 >nul
echo =========================================
echo CÀI ĐẶT CHẠY TỰ ĐỘNG CHO CRAWLER
echo =========================================
echo.

REM Đường dẫn
set "SCRIPT_DIR=%~dp0"
set "NODE_PATH=C:\Program Files\nodejs\node.exe"
set "SCRIPT_PATH=%SCRIPT_DIR%crawl-download-fast.js"
set "LOG_PATH=%SCRIPT_DIR%logs\auto-run.log"

REM Kiểm tra Node.js
echo [1/4] Kiểm tra Node.js...
if not exist "%NODE_PATH%" (
    echo [LỖI] Không tìm thấy Node.js tại: %NODE_PATH%
    echo Vui lòng cài đặt Node.js từ: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js đã tìm thấy
echo.

REM Tạo thư mục logs nếu chưa có
echo [2/4] Kiểm tra thư mục logs...
if not exist "%SCRIPT_DIR%logs" mkdir "%SCRIPT_DIR%logs"
echo [OK]
echo.

REM Xóa task cũ nếu có
echo [3/4] Xóa task cũ (nếu có)...
schtasks /delete /tn "VanBan-Crawler" /f >nul 2>&1
echo [OK]
echo.

REM Tạo task mới chạy khi khởi động
echo [4/4] Tạo task chạy khi khởi động Windows...
schtasks /create ^
    /tn "VanBan-Crawler" ^
    /tr "\"%NODE_PATH%\" \"%SCRIPT_PATH%\" >> \"%LOG_PATH%\" 2>&1" ^
    /sc onlogon ^
    /rl highest ^
    /f ^
    /np

if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Không thể tạo task. Chạy với quyền Administrator!
    pause
    exit /b 1
)

echo [OK] Task đã được tạo thành công!
echo.
echo =========================================
echo THÔNG TIN
echo =========================================
echo - Task name: VanBan-Crawler
echo - Chạy khi: User đăng nhập Windows
echo - Script: %SCRIPT_PATH%
echo - Log file: %LOG_PATH%
echo.
echo Bạn có thể quản lý task trong Task Scheduler (taskschd.msc)
echo.
echo Để CHẠY NGAY bây giờ, nhấn phím bất kỳ...
pause >nul

REM Chạy thử ngay
echo.
echo [ĐANG CHẠY THỬ...]
start /min "" "%NODE_PATH%" "%SCRIPT_PATH%" >> "%LOG_PATH%" 2>&1
echo [Đã chạy ngầm, xem log tại: %LOG_PATH%]
echo.
pause
