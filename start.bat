@echo off
title ResQAI — Starting Servers
color 0B
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║          ResQAI — Local Dev Start        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── 1. Prefer .venv python, fallback to system python ────────────
set PYTHON_BIN=.venv\Scripts\python.exe
if not exist "%PYTHON_BIN%" (
  where python >nul 2>nul
  if %errorlevel% neq 0 (
    echo  [ERROR] Python is not installed or not in PATH.
    echo          Please install Python 3.11+ and try again.
    pause
    exit /b 1
  )
  set PYTHON_BIN=python
)

:: ── 2. Open login page in browser & start launcher ───────────────
echo  [LAUNCH] Starting FastAPI backend on http://127.0.0.1:8000 ...
echo  [LAUNCH] Starting frontend server on http://127.0.0.1:3000 ...
echo.
echo  ✓ Opening login page after servers boot ...
start "" http://127.0.0.1:3000/login.html
"%PYTHON_BIN%" scripts\start_dev.py all

echo.
echo  Both servers were stopped.
pause
