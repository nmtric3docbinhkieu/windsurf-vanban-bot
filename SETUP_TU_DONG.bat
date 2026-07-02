@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title CAI DAT - QUET VAN BAN VPDT TU DONG

echo.
echo =====================================================
echo   CAI DAT HE THONG QUET VAN BAN VPDT TU DONG
echo   - Tu dong chay khi khoi dong may
echo   - Quet moi 1 gio 1 lan
echo   - Thong bao van ban moi qua Telegram
echo =====================================================
echo.

:: ===== KIEM TRA QUYEN ADMIN =====
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Can quyen Administrator!
    echo.
    echo Lam lai:
    echo   1. Click PHAI vao file SETUP_TU_DONG.bat
    echo   2. Chon "Run as administrator"
    echo.
    pause
    exit /b 1
)
echo [OK] Dang chay voi quyen Administrator
echo.

:: ===== DUONG DAN =====
set "DIR=%~dp0"
if "!DIR:~-1!"=="\" set "DIR=!DIR:~0,-1!"

set "ENV_FILE=!DIR!\.env"
set "VBS_FILE=!DIR!\run-check-hidden.vbs"
set "BAT_FILE=!DIR!\run-check.bat"
set "LOG_DIR=!DIR!\logs"
set "TASK1=VPDT-VanBan-KhoiDong"
set "TASK2=VPDT-VanBan-MoiGio"

:: ===== BUOC 1: KIEM TRA NODE.JS =====
echo [BUOC 1/4] Kiem tra Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LOI] Chua cai dat Node.js!
    echo.
    echo Vui long:
    echo   1. Mo trinh duyet, vao: https://nodejs.org
    echo   2. Bam nut LTS de tai ve
    echo   3. Cai dat xong roi chay lai file nay
    echo.
    start https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do echo [OK] Node.js %%v
echo.

:: ===== BUOC 2: CAI DAT NPM PACKAGES =====
echo [BUOC 2/4] Cai dat thu vien npm...
echo     ^(Co the mat 1-2 phut, vui long doi...^)
cd /d "!DIR!"
call npm install --silent 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] npm install that bai!
    echo     Kiem tra ket noi mang roi chay lai.
    pause
    exit /b 1
)
echo [OK] Thu vien npm da san sang
echo.

:: ===== BUOC 3: CAI PLAYWRIGHT CHROMIUM =====
echo [BUOC 3/4] Cai dat trinh duyet Playwright Chromium...
echo     ^(Co the mat 3-5 phut do tai trinh duyet, vui long doi...^)
call npx playwright install chromium >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    call npx playwright install chromium
)
echo [OK] Playwright Chromium da san sang
echo.

:: ===== BUOC 4: CAU HINH TAI KHOAN =====
echo [BUOC 4/4] Cau hinh tai khoan...
echo.

if exist "!ENV_FILE!" (
    echo     Phat hien file .env da ton tai.
    set /p RECONF=    Cau hinh lai tu dau? ^(Y = co, Enter = giu nguyen^): 
    if /i not "!RECONF!"=="Y" goto :SKIP_ENV
)

:: Tao file .env mau
echo # =====================================================         > "!ENV_FILE!"
echo # CAU HINH HE THONG QUET VAN BAN VPDT                        >> "!ENV_FILE!"
echo # Dien thong tin thuc cua ban vao day roi luu lai             >> "!ENV_FILE!"
echo # =====================================================         >> "!ENV_FILE!"
echo.                                                              >> "!ENV_FILE!"
echo # Tai khoan dang nhap vpdt.dongthap.gov.vn                   >> "!ENV_FILE!"
echo VPDT_USERNAME=TAI_KHOAN_CUA_BAN                              >> "!ENV_FILE!"
echo VPDT_PASSWORD=MAT_KHAU_CUA_BAN                               >> "!ENV_FILE!"
echo.                                                              >> "!ENV_FILE!"
echo # Telegram Bot - lay tu @BotFather tren Telegram             >> "!ENV_FILE!"
echo # Chat ID     - lay tu @userinfobot tren Telegram            >> "!ENV_FILE!"
echo TELEGRAM_BOT_TOKEN=TOKEN_BOT_CUA_BAN                         >> "!ENV_FILE!"
echo TELEGRAM_CHAT_ID=CHAT_ID_CUA_BAN                             >> "!ENV_FILE!"

echo.
echo     Da tao file .env mau.
echo     Dang mo Notepad - hay dien thong tin thuc roi LUU lai ^(Ctrl+S^).
echo.
echo     Chu y:
echo       - VPDT_USERNAME : So CCCD hoac ten dang nhap VPDT
echo       - VPDT_PASSWORD : Mat khau VPDT
echo       - TELEGRAM_BOT_TOKEN : Token bot Telegram ^(lay tu @BotFather^)
echo       - TELEGRAM_CHAT_ID   : Chat ID cua ban ^(lay tu @userinfobot^)
echo.
echo     Nhan phim bat ky de mo Notepad...
pause >nul

notepad "!ENV_FILE!"

echo.
echo     Sau khi luu xong, nhan phim bat ky de tiep tuc...
pause >nul

:SKIP_ENV

:: Kiem tra .env da co du lieu chua
findstr /C:"TAI_KHOAN_CUA_BAN" "!ENV_FILE!" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [CANH BAO] File .env van con gia tri mau ^(TAI_KHOAN_CUA_BAN^).
    echo            He thong se khong dang nhap duoc VPDT!
    echo.
    set /p CONTINUE=Tiep tuc cai dat anyway? ^(Y = co, Enter = quay lai chinh sua^): 
    if /i not "!CONTINUE!"=="Y" (
        notepad "!ENV_FILE!"
        echo Nhan phim bat ky sau khi luu xong...
        pause >nul
    )
)

:: Tao thu muc logs
if not exist "!LOG_DIR!" mkdir "!LOG_DIR!"

:: ===== TAO TASK SCHEDULER =====
echo.
echo Dang tao lich chay tu dong...

:: Xoa task cu neu co
schtasks /delete /tn "!TASK1!" /f >nul 2>&1
schtasks /delete /tn "!TASK2!" /f >nul 2>&1

:: Task 1: Chay 1 lan ngay khi dang nhap Windows
schtasks /create /tn "!TASK1!" /tr "wscript.exe \"!VBS_FILE!\"" /sc onlogon /rl highest /f /np >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong tao duoc task khoi dong!
    echo      Chay lai file nay voi quyen Administrator.
    pause
    exit /b 1
)
echo [OK] Task khoi dong: chay 1 lan khi dang nhap Windows

:: Task 2: Chay moi 1 gio
schtasks /create /tn "!TASK2!" /tr "wscript.exe \"!VBS_FILE!\"" /sc hourly /mo 1 /rl highest /f /np >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong tao duoc task dinh ky!
    echo      Chay lai file nay voi quyen Administrator.
    pause
    exit /b 1
)
echo [OK] Task dinh ky: chay moi 1 gio 1 lan

:: ===== HOAN TAT =====
echo.
echo =====================================================
echo   CAI DAT HOAN TAT!
echo =====================================================
echo.
echo   He thong se:
echo     - Quet VPDT ngay khi ban dang nhap Windows
echo     - Tu dong quet lai moi 1 gio
echo     - Gui tin nhan Telegram khi co van ban moi
echo.
echo   Xem log tai: !LOG_DIR!\vpdt-check.log
echo.
echo   De TAM DUNG hoat dong:
echo     Win + R -> taskschd.msc -> Tim VPDT-VanBan-MoiGio
echo     Click phai -> Disable
echo.
echo   De GO CAI DAT hoan toan:
echo     Chay: schtasks /delete /tn VPDT-VanBan-KhoiDong /f
echo           schtasks /delete /tn VPDT-VanBan-MoiGio /f
echo.

set /p RUNNOW=Chay thu ngay bay gio? ^(Y = co, Enter = thoi^): 
if /i "!RUNNOW!"=="Y" (
    echo.
    echo Dang chay thu - vui long doi khoang 30-60 giay...
    wscript.exe "!VBS_FILE!"
    echo.
    echo Xong! Sau khoang 1 phut hay kiem tra:
    echo   1. File log: !LOG_DIR!\vpdt-check.log
    echo   2. Telegram: co tin nhan khong?
)

echo.
pause
