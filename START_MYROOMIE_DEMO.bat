@echo off
setlocal
cd /d "%~dp0"
if exist ".myroomie-v1-frontend.pid" goto already_running
if exist ".myroomie-v1-backend.pid" goto already_running
powershell -NoProfile -Command "$node=(Get-Command node.exe).Source; $b=Start-Process -FilePath $node -ArgumentList 'server/photoVisionServer.mjs' -WorkingDirectory '%~dp0' -WindowStyle Hidden -RedirectStandardOutput 'demo-backend.log' -RedirectStandardError 'demo-backend-error.log' -PassThru; Set-Content -LiteralPath '.myroomie-v1-backend.pid' -Value $b.Id; $f=Start-Process -FilePath $node -ArgumentList 'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4180','--strictPort' -WorkingDirectory '%~dp0' -WindowStyle Hidden -RedirectStandardOutput 'demo-preview.log' -RedirectStandardError 'demo-preview-error.log' -PassThru; Set-Content -LiteralPath '.myroomie-v1-frontend.pid' -Value $f.Id"
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
start "" "http://127.0.0.1:4180/"
echo MYROOMIE Final V1: http://127.0.0.1:4180/
echo Decision backend: http://127.0.0.1:8787/
exit /b 0
:already_running
echo MYROOMIE Final V1 may already be running. Run STOP_MYROOMIE_DEMO.bat first.
exit /b 1
