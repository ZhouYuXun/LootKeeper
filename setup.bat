@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo ================================================
echo   LootKeeper — 開機自動啟動設定
echo ================================================
echo.

set FOUND=0

:: 設定 Chrome
set CHROME=
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set CHROME=%%b

if defined CHROME (
    schtasks /create /tn "LootKeeperChromeAutoStart" /tr "\"%CHROME%\" --no-startup-window" /sc ONLOGON /f >nul 2>&1
    if !errorlevel! == 0 (
        echo [成功] Google Chrome 開機自動啟動已設定
        echo        路徑：%CHROME%
        set FOUND=1
    ) else (
        echo [失敗] Google Chrome 設定失敗
    )
    echo.
)

:: 設定 Edge
set EDGE=
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" /ve 2^>nul') do set EDGE=%%b

if defined EDGE (
    schtasks /create /tn "LootKeeperEdgeAutoStart" /tr "\"%EDGE%\" --no-startup-window" /sc ONLOGON /f >nul 2>&1
    if !errorlevel! == 0 (
        echo [成功] Microsoft Edge 開機自動啟動已設定
        echo        路徑：%EDGE%
        set FOUND=1
    ) else (
        echo [失敗] Microsoft Edge 設定失敗
    )
    echo.
)

if %FOUND% == 0 (
    echo [錯誤] 找不到 Chrome 或 Edge，請確認已安裝瀏覽器。
    echo.
    pause
    exit /b 1
)

:: 登錄 lootkeeper-update: 自訂通訊協定（供設定頁面一鍵更新使用）
set "UPDATE_BAT=%~dp0update.bat"
reg add "HKCU\SOFTWARE\Classes\lootkeeper-update" /ve /d "LootKeeper Update" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Classes\lootkeeper-update" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Classes\lootkeeper-update\shell\open\command" /ve /d "\"cmd.exe\" /c \"%UPDATE_BAT%\"" /f >nul 2>&1
echo [成功] 設定頁面一鍵更新已啟用
echo.

echo ------------------------------------------------
echo 設定完成！下次重開機後，已設定的瀏覽器會自動
echo 在背景執行，不會開視窗，擴充套件排程器正常運作。
echo.
echo 請確認各瀏覽器已開啟「關閉後繼續執行背景應用程式」：
echo   Chrome：設定 ^> 系統 ^> 關閉後繼續執行背景應用程式
echo   Edge：  設定 ^> 系統與效能 ^> 關閉後繼續執行背景延伸模組
echo ------------------------------------------------
echo.
pause
