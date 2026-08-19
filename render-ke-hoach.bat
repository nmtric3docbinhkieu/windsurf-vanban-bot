@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =========================================
echo RENDER KE HOACH TU FILE TXT (KHONG DUNG API)
echo =========================================
echo.

set "INPUT_TXT=noi_dung_ke_hoach.txt"
if not "%~1"=="" set "INPUT_TXT=%~1"
set "FILE_TAG=manual-ai"
if not "%~1"=="" set "FILE_TAG=%~n1"

if not exist "%INPUT_TXT%" (
    echo [LOI] Khong tim thay file: %INPUT_TXT%
    echo Hay dan noi dung AI soan vao file nay truoc.
    pause
    exit /b 1
)

echo File noi dung: %INPUT_TXT%
echo.

set "SO_KY_HIEU=/KH-THPTĐBK"
set "NOI_NHAN=Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT"
set "NGUOI_KY=Nguyễn Minh Trí"
set "TRICH_YEU=%FILE_TAG%"

echo Thong tin tu dong:
echo - Trich yeu: %TRICH_YEU%
echo - So ky hieu: %SO_KY_HIEU%
echo - Noi nhan: %NOI_NHAN%
echo - Nguoi ky: %NGUOI_KY%

echo.
echo [DANG RENDER...]
python render_ke_hoach_from_txt.py --input-txt "%INPUT_TXT%" --file-tag "%FILE_TAG%" --trich-yeu "%TRICH_YEU%" --so-ky-hieu "%SO_KY_HIEU%" --noi-nhan "%NOI_NHAN%" --nguoi-ky "%NGUOI_KY%"

if errorlevel 1 (
    echo.
    echo [LOI] Render that bai. Xem thong bao loi o tren.
    pause
    exit /b 1
)

echo.
echo [OK] Da render xong. File DOCX nam trong thu muc van-ban-di.
pause
