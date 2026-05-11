@echo off
cd /d "%~dp0frontend"
echo Starting GPU Media Forge frontend...
echo.
echo Frontend will be at http://localhost:5173
echo Make sure the backend is running first!
echo.
npm run dev
