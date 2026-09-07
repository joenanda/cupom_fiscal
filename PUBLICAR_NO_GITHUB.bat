@echo off
chcp 65001 > nul
title Publicador Automático GitHub - Sistema Cupom Fiscal NFC-e
echo ================================================================
echo    PUBLICADOR AUTOMATICO NO GITHUB
echo    Repositorio: https://github.com/joenanda/cupom_fiscal
echo ================================================================
echo.
set /p MENSAGEM="Digite a descricao da atualizacao (ou aperte Enter): "
if "%MENSAGEM%"=="" set MENSAGEM=Atualizacao do sistema fiscal NFC-e

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publicar-github.ps1" -Mensagem "%MENSAGEM%"
echo.
pause
