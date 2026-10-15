@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:4173 in your browser.
echo Stop the server with Ctrl+C.
"C:\Program Files\nodejs\node.exe" server.cjs
pause
