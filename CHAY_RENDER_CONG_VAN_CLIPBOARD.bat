@echo off
cd /d "%~dp0"
echo =========================================
echo BUOC 1: Mo DeepSeek va copy toan bo noi dung cong van
echo          Bang Ctrl+A, sau do Ctrl+C
echo BUOC 2: Quay lai cua so nay va nhan phim bat ky
echo =========================================
pause
cmd.exe /d /k call "%~dp0render-cong-van-tu-clipboard.bat" %*