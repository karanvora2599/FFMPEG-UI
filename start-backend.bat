@echo off
cd /d "%~dp0backend"
echo Starting GPU Media Forge backend...

IF NOT EXIST ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt -q

echo.
echo Backend starting on http://127.0.0.1:8000
echo Press Ctrl+C to stop
echo.

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
