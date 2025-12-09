#!/bin/bash

# ============================================================================
# Script de Deploy Simplificado - resolve.eng.br Django
# ============================================================================

set -e

DJANGO_PATH="/var/www/resolve_django"
BACKUP_DIR="/root/backups"
CONTAINER_NAME="resolve_django_app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 DEPLOY - resolve.eng.br Django${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# STEP 1: Backups
log_info "Fazendo backups..."
mkdir -p "$BACKUP_DIR"
cp /data/nginx/proxy_host/6.conf "$BACKUP_DIR/6.conf.backup.$TIMESTAMP"
[ -f "$DJANGO_PATH/db.sqlite3" ] && cp "$DJANGO_PATH/db.sqlite3" "$BACKUP_DIR/db.sqlite3.backup.$TIMESTAMP"
log_success "Backups criados"

# STEP 2: Stop containers
log_info "Parando containers antigos..."
cd "$DJANGO_PATH"
docker-compose down 2>/dev/null || true
sleep 2
log_success "Containers parados"

# STEP 3: Build
log_info "Fazendo build da imagem Docker..."
docker build -t resolve-django:latest . > /dev/null 2>&1
log_success "Imagem construída"

# STEP 4: Start
log_info "Iniciando container..."
docker-compose up -d > /dev/null 2>&1
sleep 3
log_success "Container iniciado"

# STEP 5: Verify
if docker ps | grep -q "$CONTAINER_NAME"; then
    log_success "Container está rodando"
else
    log_error "Container não iniciou!"
    docker logs "$CONTAINER_NAME"
    exit 1
fi

# STEP 6: Nginx
log_info "Testando Nginx..."
sleep 2
if docker ps | grep -q "nginx" || docker ps | grep -q "npm"; then
    log_success "Nginx detectado"
else
    log_info "Nginx não está rodando - isso é OK para este deploy"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DEPLOY CONCLUÍDO!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "📋 Status:"
echo "   Container: $CONTAINER_NAME"
echo "   Status: $(docker ps | grep $CONTAINER_NAME | awk '{print $7}' || echo 'Desconhecido')"
echo ""
echo "🔍 Para verificar:"
echo "   • Logs: docker logs -f $CONTAINER_NAME"
echo "   • Status: docker ps | grep $CONTAINER_NAME"
echo ""

exit 0
