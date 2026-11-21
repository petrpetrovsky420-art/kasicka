@echo off
rem Kasicka - nasazeni na GitHub Pages. Spusti skript nasadit.ps1 ve slozce projektu.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0nasadit.ps1"
