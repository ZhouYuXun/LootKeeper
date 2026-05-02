@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title LootKeeper 更新程式

echo ================================================
echo   LootKeeper ^— 自動更新程式
echo ================================================
echo.

set "INSTALL_DIR=%~dp0"
set "INSTALL_DIR=%INSTALL_DIR:~0,-1%"
set "TMP_ZIP=%TEMP%\LootKeeper_update.zip"
set "TMP_DIR=%TEMP%\LootKeeper_update_src"

echo 正在查詢最新版本...
powershell -NoProfile -Command "$r = Invoke-RestMethod 'https://api.github.com/repos/ZhouYuXun/LootKeeper/releases/latest'; $r.zipball_url | Out-File '%TEMP%\lk_url.txt'; $r.tag_name | Out-File '%TEMP%\lk_tag.txt'"

set /p LATEST_URL=<"%TEMP%\lk_url.txt"
set /p LATEST_TAG=<"%TEMP%\lk_tag.txt"

if "%LATEST_TAG%"=="" (
    echo.
    echo [錯誤] 無法取得版本資訊，請確認網路連線後重試。
    echo.
    pause
    exit /b 1
)

echo 最新版本：%LATEST_TAG%
echo 安裝位置：%INSTALL_DIR%
echo.
set /p CONFIRM=確認更新到 %LATEST_TAG%？(Y/N)：

if /i not "%CONFIRM%"=="Y" (
    echo 已取消。
    pause
    exit /b 0
)

echo.
echo [1/3] 正在下載 %LATEST_TAG%...
powershell -NoProfile -Command "Invoke-WebRequest '%LATEST_URL%' -OutFile '%TMP_ZIP%' -UseBasicParsing"

if not exist "%TMP_ZIP%" (
    echo [錯誤] 下載失敗，請稍後再試。
    pause
    exit /b 1
)

echo [2/3] 正在解壓縮...
if exist "%TMP_DIR%" rmdir /s /q "%TMP_DIR%"
powershell -NoProfile -Command "Expand-Archive -Path '%TMP_ZIP%' -DestinationPath '%TMP_DIR%' -Force"

set "SRC_DIR="
for /d %%D in ("%TMP_DIR%\*") do set "SRC_DIR=%%D"

if not defined SRC_DIR (
    echo [錯誤] 解壓縮失敗。
    pause
    exit /b 1
)

echo [3/3] 正在覆蓋安裝檔案...
xcopy /e /y /i "%SRC_DIR%\*" "%INSTALL_DIR%\" >nul 2>&1

del "%TMP_ZIP%" 2>nul
rmdir /s /q "%TMP_DIR%" 2>nul
del "%TEMP%\lk_url.txt" 2>nul
del "%TEMP%\lk_tag.txt" 2>nul

echo.
echo ================================================
echo   下載並覆蓋完成！
echo ================================================
echo.
echo 最後一步：點擊瀏覽器擴充套件頁面的「重新載入」按鈕。
echo.
echo   1. 下方將自動開啟擴充套件管理頁
echo   2. 找到 LootKeeper 卡片
echo   3. 點擊右下角循環箭頭（重新載入）圖示
echo.

set CHROME=
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set CHROME=%%b
if defined CHROME (
    start "" "%CHROME%" "chrome://extensions"
    timeout /t 1 /nobreak >nul
)

set EDGE=
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" /ve 2^>nul') do set EDGE=%%b
if defined EDGE (
    start "" "%EDGE%" "edge://extensions"
    timeout /t 1 /nobreak >nul
)

echo 擴充套件管理頁已開啟，請切換至瀏覽器視窗並點擊重新載入。
echo.
pause
