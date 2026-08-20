@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "LOG_DIR=%SCRIPT_DIR%logs"
set "LOG_FILE=%LOG_DIR%\startup-auto.log"
set "LOCK_FILE=%LOG_DIR%\startup-auto.lock"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Lock cu qua 15 phut duoc coi la treo (tien trinh truoc bi crash) nen tu xoa
REM Mac dinh LOCK_STALE=1 (fail-safe): neu PowerShell loi/bi chan vi execution policy,
REM van uu tien tu phuc hoi thay vi bo qua vinh vien (tung gay loi khong chay 12 ngay lien tuc).
if exist "%LOCK_FILE%" (
    set "LOCK_STALE=1"
    for /f %%S in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if ((Get-Item -LiteralPath '%LOCK_FILE%').LastWriteTime -lt (Get-Date).AddMinutes(-15)) { Write-Output 1 } else { Write-Output 0 } } catch { Write-Output 1 }" 2^>nul') do set "LOCK_STALE=%%S"

    if "!LOCK_STALE!"=="1" (
        echo [%DATE% %TIME%] Lock cu bi treo qua 15 phut, tu dong xoa va chay lai.>> "%LOG_FILE%"
        del "%LOCK_FILE%" >nul 2>&1
    ) else (
        echo [%DATE% %TIME%] Da co tien trinh startup dang chay. Bo qua lan nay.>> "%LOG_FILE%"
        exit /b 0
    )
)

echo running > "%LOCK_FILE%"

set "NODE_PATH=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_PATH%" set "NODE_PATH="

if not defined NODE_PATH (
    for %%I in (node.exe) do set "NODE_PATH=%%~$PATH:I"
)

if not defined NODE_PATH (
    echo [%DATE% %TIME%] [LOI] Khong tim thay node.exe.>> "%LOG_FILE%"
    del "%LOCK_FILE%" >nul 2>&1
    exit /b 1
)

cd /d "%SCRIPT_DIR%"

echo.>> "%LOG_FILE%"
echo =======================================================>> "%LOG_FILE%"
echo [%DATE% %TIME%] BAT DAU pipeline startup: Quet -> Tai -> Doi ten>> "%LOG_FILE%"
echo Node: %NODE_PATH%>> "%LOG_FILE%"

echo [%DATE% %TIME%] [1/3] Quet van ban cloud...>> "%LOG_FILE%"
"%NODE_PATH%" "%SCRIPT_DIR%crawler\cloud-check-vpdt.js" >> "%LOG_FILE%" 2>&1

echo [%DATE% %TIME%] [2/3] Tai van ban moi...>> "%LOG_FILE%"
"%NODE_PATH%" "%SCRIPT_DIR%crawler\crawl-download-fast.js" >> "%LOG_FILE%" 2>&1

echo [%DATE% %TIME%] [3/3] Doi ten van ban...>> "%LOG_FILE%"
"%NODE_PATH%" "%SCRIPT_DIR%crawler\rename-v2.js" >> "%LOG_FILE%" 2>&1

echo [%DATE% %TIME%] KET THUC pipeline startup.>> "%LOG_FILE%"

del "%LOCK_FILE%" >nul 2>&1
exit /b 0
