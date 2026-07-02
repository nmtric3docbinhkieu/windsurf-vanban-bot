@echo off
REM ============================================================================
REM SCRIPT SETUP .env CẤU HÌNH CHO VANBAN-BOT
REM ============================================================================
REM
REM Tác vụ: Copy .env.example thành .env và hướng dẫn cấu hình
REM
REM ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================================================
echo VANBAN-BOT - CẤU HÌNH .env FILE
echo ============================================================================
echo.

REM Kiểm tra .env.example tồn tại
if not exist ".env.example" (
    echo ERROR: Không tìm thấy file .env.example
    echo Vui lòng đảm bảo file này tồn tại trong thư mục project
    pause
    exit /b 1
)

REM Kiểm tra .env đã tồn tại
if exist ".env" (
    echo ⚠️  File .env đã tồn tại!
    echo Bạn có muốn ghi đè không? (Y/N)
    set /p choice=
    if /i not "!choice!"=="Y" (
        echo Hủy bỏ
        pause
        exit /b 0
    )
)

REM Copy file
echo.
echo Đang copy .env.example → .env ...
copy ".env.example" ".env" >nul
if errorlevel 1 (
    echo ERROR: Không thể copy file!
    pause
    exit /b 1
)

echo ✓ Đã tạo file .env
echo.

REM Hướng dẫn cấu hình
echo ============================================================================
echo HƯỚNG DẪN CẤU HÌNH
echo ============================================================================
echo.
echo Mở file .env bằng editor yêu thích của bạn:
echo   notepad .env
echo hoặc
echo   code .env (nếu dùng VS Code)
echo.
echo CẦN CẤU HÌNH:
echo.
echo 1. VPDT Credentials (Cần thiết cho Crawler):
echo    VPDT_USERNAME=your_username
echo    VPDT_PASSWORD=your_password
echo.
echo 2. Zalo OA (Tùy chọn - nếu dùng Zalo notification):
echo    ZALO_OA_TOKEN=your_token
echo    ZALO_USER_ID=your_user_id
echo.
echo    Hướng dẫn lấy:
echo    - Tạo Zalo OA tại https://oa.zalo.me
echo    - Vào Cài đặt OA → Quản lý API → Tạo ứng dụng
echo    - Lấy Access Token và User ID
echo.
echo 3. Telegram Bot (Tùy chọn - nếu dùng Telegram notification):
echo    TELEGRAM_BOT_TOKEN=your_bot_token
echo    TELEGRAM_CHAT_ID=your_chat_id
echo.
echo    Hướng dẫn lấy:
echo    - Chat với @BotFather trên Telegram
echo    - Gõ /newbot để tạo bot mới
echo    - Lấy BOT_TOKEN
echo    - Chat với bot mới tạo, gửi bất kỳ tin nhắn nào
echo    - Truy cập: https://api.telegram.org/bot^<BOT_TOKEN^>/getUpdates
echo    - Lấy chat_id từ JSON response
echo.
echo ============================================================================
echo.
echo Sau khi cấu hình xong, nhấn Enter để mở file .env
echo.
pause

REM Mở file .env trong editor
start "" ".env"

echo.
echo ✓ Cấu hình hoàn tất!
echo.
pause
