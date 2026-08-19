@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =========================================
echo RENDER KE HOACH TU FILE TXT (KHONG DUNG API)
echo =========================================
echo.

set "INPUT_TXT=noi_dung_ke_hoach.txt"
if not "%~1"=="" set "INPUT_TXT=%~1"

if not exist "%INPUT_TXT%" (
    echo [LOI] Khong tim thay file: %INPUT_TXT%
    echo Hay dan noi dung AI soan vao file nay truoc.
    pause
    exit /b 1
)

echo File noi dung: %INPUT_TXT%
echo.

set "TRICH_YEU="
set /p TRICH_YEU=Nhap TRICH YEU cua ke hoach:
if "%TRICH_YEU%"=="" (
    echo [LOI] Trich yeu khong duoc de trong.
    pause
    exit /b 1
)

set "SO_KY_HIEU=/KH-THPTĐBK"
set /p SO_KY_HIEU=Nhap SO KY HIEU (Enter de dung mac dinh %SO_KY_HIEU%):

set "NOI_NHAN=Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT"
set /p NOI_NHAN=Nhap NOI NHAN, cach nhau bang ";" (Enter de dung mac dinh):

set "NGUOI_KY=Nguyễn Minh Trí"
set /p NGUOI_KY=Nhap NGUOI KY (Enter de dung mac dinh %NGUOI_KY%):

echo.
echo [DANG RENDER...]
python render_ke_hoach_from_txt.py --input-txt "%INPUT_TXT%" --trich-yeu "%TRICH_YEU%" --so-ky-hieu "%SO_KY_HIEU%" --noi-nhan "%NOI_NHAN%" --nguoi-ky "%NGUOI_KY%"

if errorlevel 1 (
    echo.
    echo [LOI] Render that bai. Xem thong bao loi o tren.
    pause
    exit /b 1
)

echo.
echo [OK] Da render xong. File DOCX nam trong thu muc van-ban-di.
pause
