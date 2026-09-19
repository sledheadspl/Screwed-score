@echo off
REM Double-click me, or run "setup.cmd --headless" from a terminal.
node "%~dp0setup.mjs" %*
if errorlevel 1 pause
