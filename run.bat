@echo off
cd /d "c:\Users\Administrator\Desktop\cantik"
echo Menjalankan Backend Server (npm start)...
start "Cantik Backend Server" cmd /k "cd /d c:\Users\Administrator\Desktop\cantik\server && npm start"
echo Menjalankan Frontend Preview (port 1100 untuk cantik.bpsktt.com)...
npm run preview -- --port 1100 --host 0.0.0.0
pause
