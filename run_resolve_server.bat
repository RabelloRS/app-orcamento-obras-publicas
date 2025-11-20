@echo off
REM Script para acessar servidor remoto via SSH, iniciar Django e abrir navegador
REM Autor: Rodrigo Emanuel Rabello
REM Uso: Copie este arquivo para sua área de trabalho no Windows

setlocal enabledelayedexpansion

REM Configurações - EDITE CONFORME NECESSÁRIO
set SSH_HOST=seu_usuario@seu_servidor.com
set SSH_PORT=22
set REMOTE_PORT=8081
set LOCAL_PORT=8081
set URL=http://localhost:%LOCAL_PORT%

REM Cores para mensagens (opcional)
color 0A

echo.
echo =====================================================
echo  Resolve - Django Server Launcher
echo =====================================================
echo.
echo Conectando ao servidor remoto...
echo Host: %SSH_HOST%
echo.

REM Abre conexão SSH com port forward e inicia o servidor Django
REM A janela SSH permanecerá aberta
start "" cmd /k ssh -p %SSH_PORT% %SSH_HOST% "cd /var/www/resolve_django && source .venv/bin/activate && python manage.py runserver 127.0.0.1:%REMOTE_PORT%"

REM Aguarda 3 segundos para o servidor iniciar
timeout /t 3 /nobreak

echo.
echo Abrindo navegador...
echo.

REM Abre o navegador na URL
start "" "%URL%"

echo.
echo =====================================================
echo  Servidor iniciado em: %URL%
echo  Para parar: feche a janela SSH
echo =====================================================
echo.

endlocal
