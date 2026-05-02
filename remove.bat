@echo off
chcp 65001 >nul
echo ================================================
echo   LootKeeper — 移除開機自動啟動
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

:: 清除 lootkeeper-update: 通訊協定
reg delete "HKCU\SOFTWARE\Classes\lootkeeper-update" /f >nul 2>&1
echo [成功] 一鍵更新通訊協定已清除

echo.
pause
