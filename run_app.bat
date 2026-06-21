@echo off
title OdooCafé POS Suite
echo ===================================
echo   Starting OdooCafé POS Suite...
echo ===================================
echo [1/2] Installing dependencies...
call npm install
echo.
echo [2/2] Starting local Vite dev server...
call npm run dev
pause
