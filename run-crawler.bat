@echo off
chcp 65001 >nul
title Crawler - Van Ban Den

REM Thư mục chứa script
set "SCRIPT_DIR=%~dp0"
set "NODE_PATH=C:\Program Files\nodejs\node.exe"
set "SCRIPT_PATH=%SCRIPT_DIR%crawl-download-fast.js"
set "LOG_PATH=%SCRIPT_DIR%logs\manual-run-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log"

REM Kiểm tra Node.js
if not exist "%NODE_PATH%" (
    echo [LỖI] Không tìm thấy Node.js!
    echo Cài đặt tại: https://nodejs.org
    pause
    exit /b 1
)

REM Tạo thư mục logs nếu chưa có
if not exist "%SCRIPT_DIR%logs" mkdir "%SCRIPT_DIR%logs"

echo =========================================
echo CRAWLER - VAN BAN DEN
echo =========================================
echo.
echo Đang chạy: %SCRIPT_PATH%
echo Log: %LOG_PATH%
echo.

REM Chạy script
cd /d "%SCRIPT_DIR%"
"%NODE_PATH%" "%SCRIPT_PATH%" 2>&1 | tee -a "%LOG_PATH%"

echo.
echo =========================================
echo HOÀN THÀNH
echo =========================================
pause
