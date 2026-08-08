"""ResQAI development launcher.

Starts the FastAPI backend (uvicorn) and static frontend server using
only standard library modules, with automatic .env generation, .venv detection,
dependency installation, and backend health polling.

Usage (from the repository root):
    python scripts/start_dev.py            # backend(8000) + frontend(3000)
    python scripts/start_dev.py backend    # backend only
    python scripts/start_dev.py frontend   # frontend only
"""

import os
import subprocess
import sys
import socket
import time
import urllib.request
import secrets

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BACKEND_PORT = 8000
FRONTEND_PORT = 3000
FRONTEND_DIR = os.path.join(REPO_ROOT, "frontend")


def ensure_env_file():
    """Ensure .env exists; if missing, generate from .env.example with secure keys."""
    env_path = os.path.join(REPO_ROOT, ".env")
    env_example = os.path.join(REPO_ROOT, ".env.example")
    if not os.path.exists(env_path):
        if os.path.exists(env_example):
            print("[launcher] .env not found. Generating default .env from .env.example...")
            with open(env_example, "r", encoding="utf-8") as f:
                content = f.read()
            content = content.replace("your_secret_key_here", secrets.token_urlsafe(48))
            content = content.replace("your_refresh_secret_key_here", secrets.token_urlsafe(48))
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(content)
            print("[launcher] [OK] Created .env file successfully.")


def pick_python() -> str:
    """Prefer the project virtualenv inside repo; fall back to system python."""
    venv = os.path.join(REPO_ROOT, ".venv")
    if os.name == "nt":
        venv_py = os.path.join(venv, "Scripts", "python.exe")
    else:
        venv_py = os.path.join(venv, "bin", "python")

    if os.path.exists(venv_py):
        return venv_py

    candidates = [sys.executable, "python", "python3"]
    for c in candidates:
        if c and (c in ("python", "python3") or os.path.exists(c)):
            return c
    return "python"


def ensure_virtualenv(python: str) -> str:
    """Check if .venv exists; create it and install requirements if missing."""
    venv_dir = os.path.join(REPO_ROOT, ".venv")
    if os.name == "nt":
        venv_py = os.path.join(venv_dir, "Scripts", "python.exe")
    else:
        venv_py = os.path.join(venv_dir, "bin", "python")

    if not os.path.exists(venv_py):
        print(f"[launcher] Creating virtual environment at {venv_dir}...")
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
            print("[launcher] [OK] Created virtual environment.")
        except Exception as e:
            print(f"[launcher] Warning: Failed to create venv automatically: {e}")
            return python

    # Check required dependencies in virtualenv
    req_file = os.path.join(REPO_ROOT, "requirements.txt")
    if os.path.exists(venv_py) and os.path.exists(req_file):
        try:
            res = subprocess.run([venv_py, "-c", "import fastapi, uvicorn, sqlalchemy, sklearn"], capture_output=True)
            if res.returncode != 0:
                print("[launcher] Installing missing dependencies from requirements.txt...")
                subprocess.run([venv_py, "-m", "pip", "install", "-r", req_file], check=True)
                print("[launcher] [OK] Dependencies installed.")
            return venv_py
        except Exception as e:
            print(f"[launcher] Dependency check notice: {e}")
            return venv_py

    return venv_py if os.path.exists(venv_py) else python


def port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def wait_for_health(url: str, timeout_seconds: int = 10) -> bool:
    """Poll health endpoint until backend returns 200 OK or timeout expires."""
    start_time = time.time()
    while time.time() - start_time < timeout_seconds:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ResQAI-Launcher"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def stop_proc(proc, label: str):
    if proc and proc.poll() is None:
        try:
            if os.name == "nt":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
            else:
                proc.terminate()
        except Exception:
            proc.kill()
        print(f"[launcher] Stopped {label}.")


class ServerGroup:
    def __init__(self):
        self.procs = {}

    def run(self, label, cmd):
        proc = subprocess.Popen(cmd, cwd=REPO_ROOT)
        self.procs[label] = proc
        return proc

    def shutdown(self):
        for label, proc in self.procs.items():
            stop_proc(proc, label)

    def any_failed(self):
        return any(p.poll() is not None for p in self.procs.values())


def check_module_deps(python: str, module: str) -> bool:
    try:
        res = subprocess.run([python, "-c", f"import {module}"], capture_output=True, timeout=15)
        return res.returncode == 0
    except Exception:
        return False


def main():
    ensure_env_file()
    base_python = pick_python()
    python = ensure_virtualenv(base_python)

    print("=" * 62)
    print("  ResQAI — Local Development Launcher")
    print("=" * 62)
    print(f"[launcher] Python: {python}")

    wanted = sys.argv[1] if len(sys.argv) > 1 else "all"
    want_backend = wanted in ("all", "backend")
    want_frontend = wanted in ("all", "frontend")

    # ── Preflight Checks ──
    if want_backend:
        if not os.path.exists(os.path.join(REPO_ROOT, "backend", "main.py")):
            print("[ERROR] backend/main.py not found. Run from the repository root.")
            sys.exit(1)
        if not port_free(BACKEND_PORT):
            print(f"[ERROR] Port {BACKEND_PORT} is already in use.")
            print(f"        Please stop the running process on port {BACKEND_PORT} and try again.")
            sys.exit(1)
        if not check_module_deps(python, "uvicorn"):
            print(f"[ERROR] 'uvicorn' is not installed in {python}.")
            print(f"        Run:  {python} -m pip install -r requirements.txt")
            sys.exit(1)

    if want_frontend:
        if not os.path.isdir(FRONTEND_DIR):
            print(f"[ERROR] Frontend directory not found: {FRONTEND_DIR}")
            sys.exit(1)
        if not port_free(FRONTEND_PORT):
            print(f"[ERROR] Port {FRONTEND_PORT} is already in use.")
            print(f"        Please stop the running process on port {FRONTEND_PORT} and try again.")
            sys.exit(1)

    group = ServerGroup()
    try:
        if want_backend:
            uvicorn_cmd = [
                python, "-m", "uvicorn", "backend.main:app", "--reload",
                "--host", "127.0.0.1", "--port", str(BACKEND_PORT)
            ]
            print(f"[launcher] Starting backend -> http://127.0.0.1:{BACKEND_PORT}/api/health")
            group.run("backend", uvicorn_cmd)

            # Poll health endpoint to ensure backend is operational
            health_url = f"http://127.0.0.1:{BACKEND_PORT}/api/health"
            print(f"[launcher] Polling backend health at {health_url}...")
            if wait_for_health(health_url, timeout_seconds=8):
                print(f"[launcher] [OK] Backend operational: {health_url}")
            else:
                print(f"[launcher] Notice: Backend health polling timed out (starting up in background).")

        if want_frontend:
            httpd_cmd = [
                python, "-m", "http.server", str(FRONTEND_PORT),
                "--bind", "127.0.0.1", "--directory", FRONTEND_DIR
            ]
            print(f"[launcher] Starting frontend -> http://127.0.0.1:{FRONTEND_PORT}/login.html")
            group.run("frontend", httpd_cmd)

        print("-" * 62)
        print("[launcher] All requested servers started successfully.")
        print("[launcher] Press Ctrl+C to stop servers.")
        print("-" * 62)

        while True:
            if group.any_failed():
                print("[launcher] A server process exited unexpectedly.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[launcher] Shutting down...")
    finally:
        group.shutdown()


if __name__ == "__main__":
    main()