@echo off
REM =====================================================
REM  RESOLVE - Servidor Django
REM  Launcher para Windows - Acessa servidor remoto
REM =====================================================
REM  Este script:
REM  1. Conecta via SSH ao servidor remoto com port forwarding
REM  2. Inicia o servidor Django
REM  3. Abre o navegador automaticamente
REM =====================================================

setlocal enabledelayedexpansion

REM Configuração do servidor (PRÉ-CONFIGURADO)
set SSH_USER=root
set SSH_HOST=srv557898.hstgr.cloud
set SSH_IP=85.209.93.171
set SSH_PORT=22
set REMOTE_DJANGO_PORT=8081
set LOCAL_PORT=8081
set BROWSER_URL=http://localhost:%LOCAL_PORT%

color 0A
title RESOLVE - Django Server

echo.
echo =====================================================
echo  RESOLVE - Launcher do Servidor Django
echo =====================================================
echo.
echo Conectando ao servidor remoto com port forwarding...
echo Host: %SSH_HOST%
echo IP: %SSH_IP%
echo Usuario: %SSH_USER%
echo Porta SSH: %SSH_PORT%
echo Porta Django: %REMOTE_DJANGO_PORT%
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

REM Inicia conexão SSH com port forwarding
REM -L LOCAL_PORT:localhost:REMOTE_DJANGO_PORT = local port forward
REM -N = não executa comando remoto
REM -f = background (opcional, comentado para manter janela visível)

echo Iniciando tunel SSH com port forwarding...
echo Comando: ssh -L %LOCAL_PORT%:localhost:%REMOTE_DJANGO_PORT% ...
echo.

REM Método 1: Mantém janela SSH aberta para monitoramento
start "RESOLVE - SSH Tunnel" cmd /k ^
    ssh -p %SSH_PORT% -L %LOCAL_PORT%:localhost:%REMOTE_DJANGO_PORT% %SSH_USER%@%SSH_HOST% ^
    "cd /var/www/resolve_django && source .venv/bin/activate && python manage.py runserver 0.0.0.0:%REMOTE_DJANGO_PORT%"

REM Aguarda tunel e servidor iniciar
echo.
echo Aguardando inicializacao (10 segundos)...
timeout /t 10 /nobreak

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
echo Para parar: feche a janela "RESOLVE - SSH Tunnel"
echo.
echo =====================================================
echo.

endlocal
