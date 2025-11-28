#!/bin/bash
# ============================================================================
# Deploy Rápido - resolve.eng.br Django
# Objetivo: acelerar deploys quando só há mudanças leves (templates/static/view)
# Uso: ./deploy_fast.sh [--pull] [--force-build] [--dry-run]
# ============================================================================
set -e

PROJECT_DIR="/var/www/resolve_django"
CONTAINER_NAME="resolve_django_app"
IMAGE_NAME="resolve-django:latest"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
ok() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }

DRY_RUN=false
PULL=false
FORCE_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --pull) PULL=true ;;
    --force-build) FORCE_BUILD=true ;;
  esac
done

cd "$PROJECT_DIR" || { err "Diretório do projeto não encontrado"; exit 1; }
ok "Entrou em $PROJECT_DIR"

if $PULL; then
  log "Atualizando código (git pull)";
  if $DRY_RUN; then echo "git pull --ff-only origin main"; else git pull --ff-only origin main; fi
  ok "Código sincronizado"
fi

if ! docker ps >/dev/null 2>&1; then err "Docker não está rodando"; exit 1; fi
ok "Docker ativo"

# Detectar arquivos críticos modificados em relação ao remoto
log "Verificando escopo de mudanças"
CHANGED=$(git fetch origin main >/dev/null 2>&1 && git diff --name-only origin/main...HEAD || true)
CRITICAL=false
if echo "$CHANGED" | grep -Eq '(^requirements.txt$|Dockerfile|manage.py|setup/)'; then CRITICAL=true; fi
if $FORCE_BUILD; then CRITICAL=true; fi

if $DRY_RUN; then
  echo "Arquivos alterados:"; echo "$CHANGED" | sed 's/^/  - /';
  echo "CRITICAL=$CRITICAL"; fi

# Backup leve (apenas db e requirements) se build completo
if $CRITICAL && ! $DRY_RUN; then
  log "Backup leve antes de build completo"
  mkdir -p "$BACKUP_DIR"
  [ -f db.sqlite3 ] && cp db.sqlite3 "$BACKUP_DIR/db.sqlite3.fast.$TIMESTAMP.sqlite3" && ok "Backup db"
  cp requirements.txt "$BACKUP_DIR/requirements.fast.$TIMESTAMP.txt" && ok "Backup requirements"
fi

# Estratégia
if $CRITICAL; then
  log "Mudanças críticas detectadas → rebuild de imagem"
  if $DRY_RUN; then
    echo "docker compose down"
    echo "docker build -t $IMAGE_NAME ."
    echo "docker compose up -d $CONTAINER_NAME"
  else
    docker compose down || true
    docker build -t "$IMAGE_NAME" .
    docker compose up -d "$CONTAINER_NAME"
  fi
  ok "Container reconstruído"
else
  log "Mudanças leves → restart simples"
  if $DRY_RUN; then
    echo "docker restart $CONTAINER_NAME"
    echo "docker exec $CONTAINER_NAME python manage.py collectstatic --noinput"
  else
    docker restart "$CONTAINER_NAME"
    sleep 2
    docker exec "$CONTAINER_NAME" python manage.py collectstatic --noinput >/dev/null 2>&1 || warn "Falha collectstatic (ignorando)"
  fi
  ok "Restart concluído"
fi

# Health-check
log "Health-check básico"
if $DRY_RUN; then
  echo "curl -k -I https://resolve.eng.br/inicio/"
else
  STATUS=$(curl -k -I https://resolve.eng.br/inicio/ 2>/dev/null | head -1)
  echo "$STATUS" | grep -q '200' && ok "Aplicação responde 200" || warn "Status inesperado: $STATUS"
fi

echo ""
echo -e "${GREEN}Deploy rápido finalizado${NC}";
[ "$CRITICAL" = true ] && echo "Modo: rebuild" || echo "Modo: restart simples";
$DRY_RUN && echo "(dry-run: nada executado)"

exit 0
