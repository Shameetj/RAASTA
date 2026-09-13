@echo off
echo Stopping RAASTA background services...
taskkill /F /IM cloudflared.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq *server.py*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq *uvicorn*" >nul 2>&1
echo Done. RAASTA services stopped.
pause
