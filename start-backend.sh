#!/bin/bash
set -e
cd "$(dirname "$0")/backend"
echo "Starting GPU Media Forge backend..."

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt -q

echo ""
echo "Backend starting on http://127.0.0.1:8000"
echo "Press Ctrl+C to stop"
echo ""

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
