@echo off
pushd "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish.ps1" -Push
set "publish_status=%ERRORLEVEL%"
popd
if not "%publish_status%"=="0" (
  echo Publish failed. Check the error above.
  pause
  exit /b %publish_status%
)
echo Publish completed.
pause
