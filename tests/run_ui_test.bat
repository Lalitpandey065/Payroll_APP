@echo off
echo ========================================
echo  PaySmart Pro - Practical UI Test Cycle
echo ========================================
echo.

cd /d "%~dp0\.."

echo [1/2] Installing Puppeteer (if not already installed)...
call npm install puppeteer --save-dev --silent
if errorlevel 1 (
  echo ERROR: npm install failed. Make sure Node.js is installed.
  pause
  exit /b 1
)

echo [2/2] Running UI tests...
echo.
node tests/ui_test.js

echo.
echo Done! Check tests/ui_test_report.json for the full report.
pause
