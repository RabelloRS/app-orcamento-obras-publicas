@echo off
REM =====================================================
REM  RESOLVE - Servidor Django
REM  Launcher para Windows - Acessa servidor remoto
REM =====================================================
REM  Este script:
REM  1. Conecta via SSH ao servidor remoto
REM  2. Inicia o servidor Django
REM  3. Abre o navegador automaticamente
REM =====================================================

setlocal enabledelayedexpansion

REM Configuração do servidor (PRÉ-CONFIGURADO)
set SSH_USER=root
set SSH_HOST=srv557898.hstgr.cloud
set SSH_PORT=22
set DJANGO_PORT=8081
set BROWSER_URL=http://localhost:%DJANGO_PORT%

color 0A
title RESOLVE - Django Server

echo.
echo =====================================================
echo  RESOLVE - Launcher do Servidor Django
echo =====================================================
echo.
echo Conectando ao servidor remoto...
echo Host: %SSH_HOST%
echo Usuario: %SSH_USER%
echo Porta: %SSH_PORT%
echo.

REM Verifica se SSH está disponível
where ssh >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] SSH nao encontrado!
    echo.
    echo Instalacoes recomendadas:
    echo - Git para Windows (https://git-scm.com/download/win)
    echo - Ou OpenSSH (opcional do Windows 10+)
    echo.
    pause
    exit /b 1
)

REM Inicia o servidor em nova janela
echo Iniciando servidor Django...
start "RESOLVE - SSH Server" cmd /k ^
    ssh -p %SSH_PORT% %SSH_USER%@%SSH_HOST% ^
    "cd /var/www/resolve_django && source .venv/bin/activate && python manage.py runserver 127.0.0.1:%DJANGO_PORT%"

REM Aguarda servidor iniciar
echo.
echo Aguardando inicializacao do servidor (5 segundos)...
timeout /t 5 /nobreak

REM Abre navegador
echo.
echo Abrindo navegador em: %BROWSER_URL%
echo.
start "" "%BROWSER_URL%"

echo.
echo =====================================================
echo  Servidor iniciado com sucesso!
echo =====================================================
echo.
echo URL de acesso: %BROWSER_URL%
echo.
echo Para parar: feche a janela "RESOLVE - SSH Server"
echo.
pause

endlocal
