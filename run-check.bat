@echo off
cd /d "%~dp0"

if not exist "%~dp0logs" mkdir "%~dp0logs"

set "LOGFILE=%~dp0logs\vpdt-check.log"

:: Kiem tra co tien trinh nao dang chay khong
if exist "%~dp0logs\running.lock" (
    echo [%DATE% %TIME%] Tien trinh truoc chua xong, bo qua lan nay. >> "%LOGFILE%"
    exit /b 0
)

:: Tao lock
echo running > "%~dp0logs\running.lock"

echo [%DATE% %TIME%] === BAT DAU QUET VPDT === >> "%LOGFILE%"
node "%~dp0cloud-check-vpdt.js" >> "%LOGFILE%" 2>&1
echo [%DATE% %TIME%] === KET THUC QUET === >> "%LOGFILE%"
echo. >> "%LOGFILE%"

:: Xoa lock
del "%~dp0logs\running.lock" >nul 2>&1
