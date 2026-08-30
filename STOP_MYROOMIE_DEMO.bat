@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
if exist ".myroomie-v1-frontend.pid" (
  set /p MYROOMIE_V1_FRONTEND_PID=<".myroomie-v1-frontend.pid"
  taskkill /PID !MYROOMIE_V1_FRONTEND_PID! /T /F >nul 2>&1
  del /q ".myroomie-v1-frontend.pid"
)
if exist ".myroomie-v1-backend.pid" (
  set /p MYROOMIE_V1_BACKEND_PID=<".myroomie-v1-backend.pid"
  taskkill /PID !MYROOMIE_V1_BACKEND_PID! /T /F >nul 2>&1
  del /q ".myroomie-v1-backend.pid"
)
echo MYROOMIE Final V1 stopped.
endlocal
