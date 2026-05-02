@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title LootKeeper 安裝程式

echo ================================================
echo   LootKeeper ^— 安裝程式
echo ================================================
echo.

:: 預設安裝位置
set "DEFAULT_DIR=%USERPROFILE%\Documents\LootKeeper"
echo 預設安裝位置：%DEFAULT_DIR%
echo 直接按 Enter 使用預設位置，或輸入其他路徑後按 Enter：
echo.
set /p "INSTALL_DIR=安裝至："
if "!INSTALL_DIR!"=="" set "INSTALL_DIR=%DEFAULT_DIR%"

echo.
echo [1/4] 複製檔案至 !INSTALL_DIR!...
mkdir "!INSTALL_DIR!" 2>nul
xcopy /e /y /i "%~dp0*" "!INSTALL_DIR!\" >nul 2>&1
echo       完成

:: 登錄自訂通訊協定
echo [2/4] 設定一鍵更新通訊協定...
set "UPDATE_BAT=!INSTALL_DIR!\update.bat"
reg add "HKCU\SOFTWARE\Classes\lootkeeper-update" /ve /d "LootKeeper Update" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Classes\lootkeeper-update" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Classes\lootkeeper-update\shell\open\command" /ve /d "\"cmd.exe\" /c \"!UPDATE_BAT!\"" /f >nul 2>&1
echo       完成

:: 設定開機自動啟動
echo [3/4] 設定開機自動啟動...
set FOUND=0

set CHROME=
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set CHROME=%%b
if defined CHROME (
    schtasks /create /tn "LootKeeperChromeAutoStart" /tr "\"!CHROME!\" --no-startup-window" /sc ONLOGON /f >nul 2>&1
    echo       Chrome 已設定
    set FOUND=1
)

set EDGE=
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" /ve 2^>nul') do set EDGE=%%b
if defined EDGE (
    schtasks /create /tn "LootKeeperEdgeAutoStart" /tr "\"!EDGE!\" --no-startup-window" /sc ONLOGON /f >nul 2>&1
    echo       Edge 已設定
    set FOUND=1
)

if %FOUND%==0 echo       找不到 Chrome 或 Edge，請安裝瀏覽器後重新執行

:: 開啟瀏覽器擴充套件管理頁
echo [4/4] 開啟瀏覽器擴充套件管理頁...
if defined CHROME start "" "!CHROME!" "chrome://extensions"
if defined EDGE   start "" "!EDGE!"   "edge://extensions"
timeout /t 2 /nobreak >nul
echo       完成

echo.
echo ================================================
echo   最後一步（需在瀏覽器手動完成）
echo ================================================
echo.
echo   1. 切換至剛才開啟的瀏覽器視窗
echo   2. 開啟右上角「開發人員模式」
echo   3. 點擊「載入未封裝項目」
echo   4. 選擇資料夾：!INSTALL_DIR!
echo   5. 出現 LootKeeper 卡片即安裝完成
echo.
echo   往後更新：點擴充套件圖示 ^> 設定 ^> 檢查更新 ^> 立即更新
echo.
pause
