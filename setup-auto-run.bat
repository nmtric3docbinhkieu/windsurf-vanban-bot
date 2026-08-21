@echo off
echo =========================================
echo CAI DAT CHAY TU DONG CHO PIPELINE VAN BAN
echo =========================================
echo.

REM Paths
set "SCRIPT_DIR=%~dp0"
set "RUNNER_PATH=%SCRIPT_DIR%run-startup-auto.bat"
set "LOG_PATH=%SCRIPT_DIR%logs\startup-auto.log"
if "%APPDATA%"=="" set "APPDATA=%USERPROFILE%\AppData\Roaming"
for /f "tokens=*" %%A in ("%APPDATA%") do set "APPDATA=%%A"
for /f "tokens=*" %%A in ("%USERPROFILE%") do set "USERPROFILE=%%A"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_BAT=%STARTUP_DIR%\VanBan-Auto-Startup.bat"

REM Kiem tra file runner
echo [1/4] Kiem tra file runner...
if not exist "%RUNNER_PATH%" (
    echo [LOI] Khong tim thay file: %RUNNER_PATH%
    pause
    exit /b 1
)

echo [OK] Runner da san sang
echo.

REM Ensure logs directory exists
echo [2/4] Kiem tra thu muc logs...
if not exist "%SCRIPT_DIR%logs" mkdir "%SCRIPT_DIR%logs"
echo [OK]
echo.

REM Xoa task cu neu co
echo [3/4] Xoa task cu (neu co)...
schtasks /delete /tn "VanBan-Crawler" /f >nul 2>&1
schtasks /delete /tn "VanBan-Auto-Startup" /f >nul 2>&1
echo [OK]
echo.

REM Tao task moi chay khi dang nhap
echo [4/4] Tao task chay khi khoi dong Windows...
schtasks /create ^
    /tn "VanBan-Auto-Startup" ^
    /tr "%ComSpec% /d /c \"\"%RUNNER_PATH%\"\"" ^
    /sc onlogon ^
    /rl highest ^
    /it ^
    /f

if errorlevel 1 (
    echo [WARN] Tao task voi quyen cao nhat that bai. Thu lai voi quyen user hien tai...
    schtasks /create ^
        /tn "VanBan-Auto-Startup" ^
        /tr "%ComSpec% /d /c \"\"%RUNNER_PATH%\"\"" ^
        /sc onlogon ^
            /it ^
            /f

    if errorlevel 1 (
        echo [WARN] Khong the tao task scheduler. Chuyen sang Startup folder...

        if not exist "%STARTUP_DIR%" (
            mkdir "%STARTUP_DIR%"
            if %ERRORLEVEL% NEQ 0 (
                echo [LOI] Khong the tao thu muc Startup: %STARTUP_DIR%
                pause
                exit /b 1
            )
        )

        > "%STARTUP_BAT%" echo @echo off
        >> "%STARTUP_BAT%" echo start "" /min "%SystemRoot%\System32\cmd.exe" /c ""%RUNNER_PATH%""

        if not exist "%STARTUP_BAT%" (
            echo [LOI] Da tao launcher nhung khong tim thay file startup.
            pause
            exit /b 1
        )
        echo [OK] Da cai dat Startup folder: %STARTUP_BAT%
        set "INSTALL_MODE=Startup folder"
    ) else (
        set "INSTALL_MODE=Task Scheduler"
    )
) else (
    set "INSTALL_MODE=Task Scheduler"
)

echo [OK] Da cai dat tu dong bang: %INSTALL_MODE%
echo.
echo =========================================
echo THONG TIN
echo =========================================
echo - Task name: VanBan-Auto-Startup (neu dung Task Scheduler)
echo - Chay khi: User dang nhap Windows
echo - Runner: %RUNNER_PATH%
echo - Pipeline: 1) Quet cloud 2) Tai file moi 3) Doi ten
echo - Log file: %LOG_PATH%
echo - Startup fallback: %STARTUP_BAT%
echo.
echo Ban co the quan ly task trong Task Scheduler (taskschd.msc)
echo.
echo De CHAY NGAY bay gio, nhan phim bat ky...
pause >nul

REM Chay thu ngay
echo.
echo [DANG CHAY THU...]
start /min "" "%SystemRoot%\System32\cmd.exe" /c ""%RUNNER_PATH%""
echo [Da chay ngam, xem log tai: %LOG_PATH%]
echo.
pause
