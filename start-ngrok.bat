@echo off
chcp 65001 >nul
title Najah — ngrok Share

echo.
echo  ╔══════════════════════════════════════╗
echo  ║      Najah Platform — ngrok Share    ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── 1. Start Backend ───────────────────────────────────────
echo [1/3] Starting Backend (port 5000)...
cd /d "%~dp0backend"
start "Najah Backend" cmd /k "npm start"
timeout /t 4 /nobreak >nul

:: ── 2. Start Frontend ──────────────────────────────────────
echo [2/3] Starting Frontend (port 3000)...
cd /d "%~dp0frontend"
start "Najah Frontend" cmd /k "npm start"
timeout /t 3 /nobreak >nul

:: ── 3. Start ngrok tunnels ─────────────────────────────────
echo [3/3] Opening ngrok tunnels...
echo.
echo  ┌─────────────────────────────────────────────────────┐
echo  │  سيظهر رابطان:                                      │
echo  │                                                       │
echo  │  • Backend  → انسخه وضعه في .env.ngrok              │
echo  │    VITE_API_URL=https://XXXX.ngrok-free.app/api      │
echo  │    VITE_SOCKET_URL=https://XXXX.ngrok-free.app       │
echo  │                                                       │
echo  │  • Frontend → ابعت الرابط ده لصحابك                 │
echo  │                                                       │
echo  └─────────────────────────────────────────────────────┘
echo.

:: Backend tunnel (port 5000)
start "ngrok Backend" cmd /k "ngrok http 5000"
timeout /t 3 /nobreak >nul

:: Frontend tunnel (port 3000)
start "ngrok Frontend" cmd /k "ngrok http 3000"

echo.
echo  ✅ كل حاجة اشتغلت! 
echo.
echo  الخطوة الأخيرة:
echo  1. من نافذة "ngrok Backend" — انسخ الـ URL
echo  2. افتح frontend\.env.ngrok وحدّث VITE_API_URL و VITE_SOCKET_URL
echo  3. أعد تشغيل الـ Frontend
echo  4. من نافذة "ngrok Frontend" — ابعت الـ URL لصحابك
echo.
pause
