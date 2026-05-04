@echo off
chcp 65001 >nul
setlocal

net session >nul 2>&1
if errorlevel 1 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ================================================
echo   LootKeeper — 完整移除
echo ================================================
echo.

schtasks /delete /tn "LootKeeperChromeAutoStart" /f >nul 2>&1
if %errorlevel% == 0 (
    echo [成功] Google Chrome 開機自動啟動已移除
) else (
    echo [提示] Google Chrome 排程不存在或已移除
)

schtasks /delete /tn "LootKeeperEdgeAutoStart" /f >nul 2>&1
if %errorlevel% == 0 (
    echo [成功] Microsoft Edge 開機自動啟動已移除
) else (
    echo [提示] Microsoft Edge 排程不存在或已移除
)

echo.
echo 完成。請手動至瀏覽器擴充套件管理頁移除 LootKeeper，並刪除安裝資料夾。
echo.
pause
