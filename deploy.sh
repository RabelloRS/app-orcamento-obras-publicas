#!/bin/bash

# ============================================================================
# Script de Deploy Automatizado - resolve.eng.br Django
# ============================================================================

set -e  # Exit on error

DJANGO_PATH="/var/www/resolve_django"
BACKUP_DIR="/root/backups"
CONTAINER_NAME="resolve_django_app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# ============================================================================
# PASSO 1: PRÉ-FLIGHT CHECKS
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 INICIANDO DEPLOY - resolve.eng.br Django${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Executando pré-flight checks..."

# Verificar se Django está instalado
if ! cd "$DJANGO_PATH" 2>/dev/null; then
    log_error "Diretório $DJANGO_PATH não encontrado!"
    exit 1
fi
log_success "Diretório do projeto encontrado"

# Verificar se Docker está rodando
if ! docker ps >/dev/null 2>&1; then
    log_error "Docker não está rodando!"
    exit 1
fi
log_success "Docker está rodando"

# Verificar se rede npm-network existe
if ! docker network inspect npm-network >/dev/null 2>&1; then
    log_warning "Rede npm-network não encontrada. Criando..."
    docker network create npm-network
    log_success "Rede npm-network criada"
else
    log_success "Rede npm-network existe"
fi

# Verificar se Django check passa
if ! source .venv/bin/activate && python manage.py check >/dev/null 2>&1; then
    log_error "Django health check falhou!"
    exit 1
fi
log_success "Django health check passou"

# ============================================================================
# PASSO 2: FAZER BACKUPS
# ============================================================================
echo ""
log_info "Fazendo backups..."

mkdir -p "$BACKUP_DIR"

# Backup do arquivo Nginx config
cp /data/nginx/proxy_host/6.conf "$BACKUP_DIR/6.conf.backup.$TIMESTAMP"
log_success "Backup de 6.conf criado"

# Backup do banco de dados
if [ -f db.sqlite3 ]; then
    cp db.sqlite3 "$BACKUP_DIR/db.sqlite3.backup.$TIMESTAMP"
    log_success "Backup do banco de dados criado"
fi

# Backup do requirements.txt
cp requirements.txt "$BACKUP_DIR/requirements.txt.backup.$TIMESTAMP"
log_success "Backup de requirements.txt criado"

# ============================================================================
# PASSO 3: PARAR CONTAINER ANTIGO (se existir)
# ============================================================================
echo ""
log_info "Verificando containers antigos..."

if docker ps -a | grep -q "$CONTAINER_NAME"; then
    log_warning "Container $CONTAINER_NAME encontrado. Parando..."
    docker-compose down 2>/dev/null || true
    sleep 2
    log_success "Container parado"
else
    log_info "Nenhum container anterior encontrado"
fi

# ============================================================================
# PASSO 4: BUILD DA IMAGEM DOCKER
# ============================================================================
echo ""
log_info "Fazendo build da imagem Docker..."

if docker build -t resolve-django:latest . >/dev/null 2>&1; then
    log_success "Imagem Docker construída com sucesso"
    docker images | grep resolve-django | head -1
else
    log_error "Erro ao construir imagem Docker!"
    exit 1
fi

# ============================================================================
# PASSO 5: INICIAR CONTAINER
# ============================================================================
echo ""
log_info "Iniciando container..."

if docker-compose up -d; then
    log_success "Container iniciado"
    sleep 3
else
    log_error "Erro ao iniciar container!"
    exit 1
fi

# Verificar se container está rodando
if docker ps | grep -q "$CONTAINER_NAME"; then
    log_success "Container está rodando"
else
    log_error "Container não está rodando!"
    docker logs "$CONTAINER_NAME"
    exit 1
fi

# ============================================================================
# PASSO 6: VALIDAR NGINX
# ============================================================================
echo ""
log_info "Validando configuração do Nginx..."

sleep 2

if docker ps --format '{{.Names}}' | grep -q '^default_npm_1$'; then
    if docker exec default_npm_1 nginx -t >/dev/null 2>&1; then
        log_success "Configuração do Nginx válida"
    else
        log_error "Erro na configuração do Nginx!"
        docker exec default_npm_1 nginx -t
        exit 1
    fi

    # Recarregar Nginx
    if docker exec default_npm_1 nginx -s reload >/dev/null 2>&1; then
        log_success "Nginx recarregado"
    else
        log_error "Erro ao recarregar Nginx!"
        exit 1
    fi
else
    log_warning "Container default_npm_1 não está em execução. Pulando validação do proxy."
fi

# ============================================================================
# PASSO 7: TESTES FINAIS
# ============================================================================
echo ""
log_info "Executando testes finais..."

sleep 3

# Teste 1: Conectividade do container
if docker exec default_npm_1 curl -s http://$CONTAINER_NAME:8000/ >/dev/null 2>&1; then
    log_success "Container respondendo na porta 8000"
else
    log_warning "Container não respondendo (pode estar inicializando)"
fi

# Teste 2: Ver logs
echo ""
log_info "Últimas linhas de log do Django:"
docker logs --tail 10 $CONTAINER_NAME | tail -5

# ============================================================================
# RESUMO FINAL
# ============================================================================
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "📊 Informações do Deploy:"
echo "   Container: $CONTAINER_NAME"
echo "   Imagem: resolve-django:latest"
echo "   Porta: 8000"
echo "   Timestamp: $TIMESTAMP"
echo ""
echo "🔗 Endpoints:"
echo "   Local: http://localhost:8000"
echo "   Produção: https://resolve.eng.br"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verificar: curl -I https://resolve.eng.br"
echo "   2. Ver logs: docker logs -f $CONTAINER_NAME"
echo "   3. Monitorar: docker stats $CONTAINER_NAME"
echo ""
echo "🔄 Para rollback:"
echo "   cp $BACKUP_DIR/6.conf.backup.$TIMESTAMP /data/nginx/proxy_host/6.conf"
echo "   docker exec default_npm_1 nginx -s reload"
echo ""

exit 0
