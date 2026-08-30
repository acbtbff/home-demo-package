@echo off
setlocal
cd /d "%~dp0"
if exist ".myroomie-demo.pid" (
  echo MYROOMIE Demo may already be running. Run STOP_MYROOMIE_DEMO.bat first.
  exit /b 1
)
powershell -NoProfile -Command "$p=Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','pnpm preview --host 127.0.0.1 --port 4173 --strictPort 1^> demo-preview.log 2^>^&1' -WorkingDirectory '%~dp0' -WindowStyle Hidden -PassThru; Set-Content -LiteralPath '.myroomie-demo.pid' -Value $p.Id"
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
start "" "http://127.0.0.1:4173/"
echo MYROOMIE Demo: http://127.0.0.1:4173/
endlocal
