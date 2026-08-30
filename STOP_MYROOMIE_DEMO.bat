@echo off
setlocal
cd /d "%~dp0"
if not exist ".myroomie-demo.pid" (
  echo MYROOMIE Demo is not running.
  exit /b 0
)
set /p MYROOMIE_PID=<".myroomie-demo.pid"
taskkill /PID %MYROOMIE_PID% /T /F >nul 2>&1
del /q ".myroomie-demo.pid"
echo MYROOMIE Demo stopped.
endlocal
