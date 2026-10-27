@echo off
REM YiayiaOS - installation launcher (Windows). Runs fully offline.
REM Needs Python 3 (python.org) and Google Chrome.
cd /d "%~dp0\.."
set PORT=8080
start "yiayia-server" /min python -m http.server %PORT% --bind 127.0.0.1
timeout /t 2 /nobreak >nul
set CHROME="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="%LocalAppData%\Google\Chrome\Application\chrome.exe"
%CHROME% --kiosk --no-first-run --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-translate --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required --use-fake-ui-for-media-stream --user-data-dir="%TEMP%\yiayiaos-kiosk-profile" "http://127.0.0.1:%PORT%/?kiosk"
