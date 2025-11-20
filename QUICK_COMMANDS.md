# 🎯 Comandos Rápidos - resolve.eng.br Django

## 🚀 Deploy Automatizado (RECOMENDADO)

```bash
cd /var/www/resolve_django && ./deploy.sh
```

Este script faz TUDO automaticamente:
- ✅ Pré-flight checks
- ✅ Backups de configuração e database
- ✅ Build da imagem Docker
- ✅ Inicia container
- ✅ Valida Nginx
- ✅ Testes finais

---

## 🔧 Comandos Manuais Úteis

### Começar o Deploy
```bash
cd /var/www/resolve_django
docker build -t resolve-django:latest .
docker-compose up -d
```

### Monitoramento
```bash
# Ver se container está rodando
docker ps | grep resolve_django_app

# Ver logs em tempo real
docker logs -f resolve_django_app

# Ver uso de recursos
docker stats resolve_django_app

# Ver logs do Nginx
tail -f /data/logs/proxy-host-6_error.log
```

### Gerenciamento Django
```bash
cd /var/www/resolve_django

# Migrações
docker exec resolve_django_app python manage.py migrate

# Criar superuser
docker exec -it resolve_django_app python manage.py createsuperuser

# Coletar static files
docker exec resolve_django_app python manage.py collectstatic --noinput

# Shell Django
docker exec -it resolve_django_app python manage.py shell
```

### Gerenciamento de Container
```bash
# Restart do container
docker-compose restart

# Parar o container
docker-compose down

# Remover imagem e reconstruir
docker rmi resolve-django:latest
docker build -t resolve-django:latest .
docker-compose up -d
```

### Teste de Conectividade
```bash
# Teste local (do host)
curl -I http://localhost:8000

# Teste do container Nginx
docker exec default_npm_1 curl -I http://resolve_django_app:8000

# Teste do domínio
curl -I https://resolve.eng.br

# Teste completo (com headers)
curl -v https://resolve.eng.br 2>&1 | grep -E "HTTP|Server|Date"
```

---

## 📊 Verificações de Saúde

```bash
# Health Check Completo
check_health() {
    echo "1️⃣  Container rodando?"
    docker ps | grep resolve_django_app && echo "✅ SIM" || echo "❌ NÃO"
    
    echo ""
    echo "2️⃣  Django respondendo?"
    docker exec default_npm_1 curl -s http://resolve_django_app:8000 | head -c 50 && echo "✅ SIM" || echo "❌ NÃO"
    
    echo ""
    echo "3️⃣  Nginx funciona?"
    docker exec default_npm_1 nginx -t 2>&1 | grep "successful" && echo "✅ SIM" || echo "❌ NÃO"
    
    echo ""
    echo "4️⃣  Domínio resolve?"
    curl -s -I https://resolve.eng.br | head -1
}

check_health
```

---

## 🔄 Rollback Rápido

Se algo der errado, volte para a configuração anterior:

```bash
# 1. Parar o novo container
cd /var/www/resolve_django
docker-compose down

# 2. Restaurar configuração Nginx
# (Substitua TIMESTAMP pela data do backup)
cp /root/backups/6.conf.backup.20251120_143022 /data/nginx/proxy_host/6.conf

# 3. Recarregar Nginx
docker exec default_npm_1 nginx -s reload

# 4. Verificar
curl -I https://resolve.eng.br
```

---

## 📋 Variáveis de Ambiente Importantes

Editadas em `/var/www/resolve_django/.env`:

```bash
# Debug (NUNCA True em produção!)
DEBUG=False

# Domínios permitidos
ALLOWED_HOSTS=resolve.eng.br,www.resolve.eng.br

# Database
DATABASE_URL=sqlite:////app/db.sqlite3

# Secret key (gerar se não existir)
SECRET_KEY=your-secret-key-here
```

---

## 🐛 Troubleshooting Rápido

### "502 Bad Gateway"
```bash
# Container está rodando?
docker ps | grep resolve_django_app

# Nginx pode conectar?
docker exec default_npm_1 curl http://resolve_django_app:8000

# Ver erro do Nginx
tail -20 /data/logs/proxy-host-6_error.log
```

### "ConnectionRefused"
```bash
# Verificar se porta 8000 está aberta
netstat -tlnp | grep 8000

# Verificar se container está na rede correta
docker network inspect npm-network | grep resolve_django_app
```

### "PermissionDenied" em media/static
```bash
# Dar permissões
sudo chown -R 1000:1000 /var/www/resolve_django/media
sudo chown -R 1000:1000 /var/www/resolve_django/static
chmod 755 /var/www/resolve_django/media
chmod 755 /var/www/resolve_django/static
```

### Container "Exited"
```bash
# Ver o motivo
docker logs resolve_django_app

# Limpar e recriar
docker-compose down --remove-orphans
docker rmi resolve-django:latest
./deploy.sh
```

---

## 📞 Arquivos Importantes

```
/var/www/resolve_django/
├── Dockerfile              # Imagem Docker
├── docker-compose.yml      # Configuração Docker Compose
├── deploy.sh              # Script de deploy automatizado ⭐
├── DEPLOY_GUIDE.md        # Guia completo
├── QUICK_COMMANDS.md      # Este arquivo
├── .env                   # Variáveis de ambiente
├── requirements.txt       # Dependências Python
├── manage.py             # Django management
├── db.sqlite3            # Banco de dados
└── ferramenta_drenagem/  # Código do projeto

Logs e configurações:
/data/nginx/proxy_host/6.conf        # Configuração do Nginx
/data/logs/proxy-host-6_access.log   # Logs de acesso
/data/logs/proxy-host-6_error.log    # Logs de erro
```

---

## ✅ Checklist Pós-Deploy

- [ ] Script rodou sem erros
- [ ] curl -I https://resolve.eng.br retorna 200
- [ ] Página carrega no navegador
- [ ] Logs não mostram erros
- [ ] Container está na rede npm-network
- [ ] Static files estão sendo servidos
- [ ] Media files estão acessíveis

---

## 🎓 Dicas Pro

1. **Múltiplos deploys**: Use tags diferentes na imagem (`resolve-django:v1.0`, `resolve-django:v1.1`)
2. **Sem downtime**: Use `docker-compose up -d` (não usa `down`)
3. **Limpar recursos**: `docker system prune -f` (remove imagens não usadas)
4. **Performance**: Monitore com `docker stats` e ajuste workers do Gunicorn se necessário
5. **SSL**: Já está configurado automaticamente pelo Nginx Proxy Manager

---

**Última atualização:** 2025-11-20
**Versão:** 1.0
