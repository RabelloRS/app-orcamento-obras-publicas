@echo off
REM =====================================================
REM  Resolve - Django Server Remote Launcher
REM  Script para Windows - Acessa servidor remoto via SSH
REM =====================================================
REM  INSTRUÇÕES:
REM  1. Configure as variáveis abaixo com seus dados
REM  2. Copie para sua Área de Trabalho (Desktop)
REM  3. Execute o script
REM =====================================================

setlocal enabledelayedexpansion

REM ============= CONFIGURAÇÕES =============
REM Edite estas linhas com seus dados
set SSH_USER=root
set SSH_HOST=seu_servidor_ip_ou_dominio
set SSH_PORT=22
set REMOTE_APP_PORT=8081
set BROWSER_PORT=8081

REM =========================================

set URL=http://localhost:%BROWSER_PORT%

REM Limpa e define cor do console
cls
color 0A

echo.
echo =====================================================
echo  RESOLVE - Django Server Launcher
echo =====================================================
echo.
echo [INFO] Conectando ao servidor remoto...
echo [INFO] Usuario: %SSH_USER%
echo [INFO] Host: %SSH_HOST%:%SSH_PORT%
echo.

REM Verifica se SSH está disponível
ssh -V >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] SSH nao foi encontrado!
    echo [INFO] Certifique-se de que o Git Bash ou OpenSSH estao instalados
    echo.
    pause
    exit /b 1
)

REM Abre a conexão SSH em uma nova janela e inicia o servidor
echo [INFO] Iniciando servidor Django...
echo.

start "Resolve Server - SSH Connection" cmd /k ^
    ssh -p %SSH_PORT% %SSH_USER%@%SSH_HOST% ^
    "cd /var/www/resolve_django && source .venv/bin/activate && python manage.py runserver 127.0.0.1:%REMOTE_APP_PORT%"

REM Aguarda o servidor iniciar
echo [INFO] Aguardando inicializacao do servidor (5 segundos)...
timeout /t 5 /nobreak

REM Verifica se consegue conectar
echo [INFO] Testando conexao...
curl -s http://localhost:%BROWSER_PORT%/ >nul 2>&1
if errorlevel 1 (
    echo.
    echo [AVISO] Servidor pode nao estar pronto. Abrindo navegador mesmo assim...
    echo.
)

REM Abre o navegador
echo [INFO] Abrindo navegador em: %URL%
echo.

start "" "%URL%"

echo.
echo =====================================================
echo  [SUCESSO] Servidor iniciado!
echo =====================================================
echo.
echo URL: %URL%
echo.
echo Para parar o servidor, feche a janela "Resolve Server - SSH Connection"
echo.
pause

endlocal
