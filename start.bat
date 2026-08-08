@echo off
title ResQAI — Starting Servers
color 0B
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║          ResQAI — Local Dev Start        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── 1. Check .venv exists ──────────────────────────────────────────
if not exist ".venv\Scripts\python.exe" (
  echo  [ERROR] .venv not found. Run:  python -m venv .venv  then  .venv\Scripts\pip install -r requirements.txt
  pause
  exit /b 1
)

:: ── 2. Start FastAPI backend in a new window ───────────────────────
echo  [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "ResQAI Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 2 /nobreak >nul

:: ── 3. Start frontend static server in a new window ───────────────
echo  [2/2] Starting frontend on http://localhost:3000 ...
start "ResQAI Frontend" cmd /k "node_modules\.bin\http-server frontend -a 127.0.0.1 -p 3000 -c-1"
timeout /t 2 /nobreak >nul

:: ── 4. Open login page in default browser ─────────────────────────
echo.
echo  ✓ Opening http://localhost:3000/login.html ...
start http://localhost:3000/login.html

echo.
echo  Both servers are running in separate windows.
echo  Close those windows to shut down the servers.
echo.
pause
