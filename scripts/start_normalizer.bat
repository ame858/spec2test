@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title cc-switch 流式归一化代理 (15722 -> 15721)

echo ============================================================
echo  流式归一化代理：127.0.0.1:15722  -^>  127.0.0.1:15721
echo  作用：把被拆碎的 text content block 合并成一块
echo  关闭此窗口 = 停止代理（Claude Code 会因此连不上，记得先改回 15721）
echo ============================================================
echo.

netstat -ano | findstr /C:"127.0.0.1:15722" | findstr LISTENING >nul
if not errorlevel 1 (
    echo [错误] 端口 15722 已被占用，可能已经有一个代理在运行。
    echo        先关掉它，或改用 --listen 指定其它端口。
    pause
    exit /b 1
)

:run
echo [normalize] 启动中... %date% %time%
py -3.12 scripts\normalize_proxy.py --listen 15722 --upstream 15721 -v
echo.
echo [normalize] 进程已退出（退出码 %errorlevel%），3 秒后自动重启。按 Ctrl+C 终止。
timeout /t 3 /nobreak >nul
goto run
