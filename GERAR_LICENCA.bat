@echo off
chcp 65001 > nul
title Gerador de Licenças - Guará Segurança e Internet
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\gerar-licenca.ps1"
echo.
pause
