@echo off
echo ============================================
echo  WasteZero Smart Platform - Starting Servers
echo ============================================
echo.
echo Starting WasteZero Backend (Port 5000)...
start "WasteZero Backend" cmd /k "cd wastezero-backend && npx ts-node server.ts"

timeout /t 3 /nobreak >nul

echo Starting WasteZero Frontend (Port 4200)...
start "WasteZero Frontend" cmd /k "npx ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json"

echo.
echo ============================================
echo  Servers starting up...
echo  Frontend: http://localhost:4200
echo  Backend:  http://localhost:5000
echo ============================================
