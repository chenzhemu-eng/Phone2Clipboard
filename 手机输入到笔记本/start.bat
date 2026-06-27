@echo off
chcp 65001 >nul 2>&1
title 手机输入到笔记本 - 局域网剪贴板同步

echo.
echo  ╔═══════════════════════════════════════════╗
echo  ║     手机输入到笔记本 · 正在启动...         ║
echo  ╚═══════════════════════════════════════════╝
echo.

:: 检查 Node.js 是否可用
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [错误] 未找到 Node.js，请先安装 Node.js 16+
    echo  下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 显示 Node.js 版本
for /f "tokens=*" %%v in ('node -v') do echo  Node.js 版本: %%v

:: 切换到脚本所在目录
cd /d "%~dp0"

:: 启动服务
echo.
node server.js

:: 如果服务退出，暂停以便查看错误信息
echo.
echo  服务已停止
pause
