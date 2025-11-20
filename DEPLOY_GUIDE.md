# 🚀 Guia de Deploy - resolve.eng.br Django

## Status da Migração

✅ **Configuração preparada para:**
- Rodar Django em `/var/www/resolve_django/` via Docker
- Container: `resolve_django_app`
- Porta interna: 8000
- Domínio: `resolve.eng.br` e `www.resolve.eng.br`

---

## 📋 Pré-requisitos

Antes de fazer o deploy, verifique:

```bash
# 1. Verificar se o Django está funcionando localmente
cd /var/www/resolve_django
python manage.py check

# 2. Verificar se tem all as dependências
cat requirements.txt | head

# 3. Verificar permissões
ls -la /var/www/resolve_django/db.sqlite3
ls -la /var/www/resolve_django/media/
```

---

## 🔧 Passos para Deploy

### **PASSO 1: Fazer Backup da Configuração Atual**

```bash
# Backup do arquivo de configuração do Nginx
cp /data/nginx/proxy_host/6.conf /root/backups/6.conf.backup.$(date +%Y%m%d_%H%M%S)

# Backup do projeto antigo (se necessário)
tar -czf /root/backups/eng-tools-forge.backup.$(date +%Y%m%d_%H%M%S).tar.gz /var/www/eng-tools-forge/

# Backup do banco de dados Django
cp /var/www/resolve_django/db.sqlite3 /root/backups/db.sqlite3.backup.$(date +%Y%m%d_%H%M%S)
```

### **PASSO 2: Verificar a Rede Docker**

```bash
# Verificar se a rede npm-network existe
docker network ls | grep npm-network

# Se não existir, criar:
docker network create npm-network
```

### **PASSO 3: Build da Imagem Docker**

```bash
cd /var/www/resolve_django

# Build da imagem
docker build -t resolve-django:latest .

# Verificar se foi criada
docker images | grep resolve-django
```

### **PASSO 4: Iniciar o Container**

```bash
cd /var/www/resolve_django

# Subir o container
docker-compose up -d

# Verificar se está rodando
docker ps | grep resolve_django_app

# Ver logs
docker logs -f resolve_django_app
```

### **PASSO 5: Testar a Conectividade**

```bash
# Verificar se o container está na rede correta
docker network inspect npm-network | grep resolve_django_app

# Testar conexão do container
docker exec resolve_django_app curl http://localhost:8000
```

### **PASSO 6: Validar Configuração do Nginx**

```bash
# Testar sintaxe do Nginx
docker exec default_npm_1 nginx -t

# Se OK, recarregar Nginx
docker exec default_npm_1 nginx -s reload
```

### **PASSO 7: Testar em Produção**

```bash
# Testar localmente
curl -I http://85.209.93.171:8000

# Testar através do domínio (externa)
curl -I https://resolve.eng.br

# Verificar headers
curl -v https://resolve.eng.br | head -20
```

---

## 🐛 Troubleshooting

### Container não sobe
```bash
# Ver logs completos
docker logs resolve_django_app

# Verificar se porta está livre
netstat -tlnp | grep 8000

# Verificar sintaxe do docker-compose.yml
docker-compose config
```

### Nginx retorna 502 Bad Gateway
```bash
# Verificar se o container está rodando
docker ps | grep resolve_django_app

# Verificar conectividade entre containers
docker exec default_npm_1 curl http://resolve_django_app:8000

# Verificar logs do Nginx
tail -f /data/logs/proxy-host-6_error.log
```

### Erro de permissões nos volumes
```bash
# Dar permissões ao usuário django no host
sudo chown -R 1000:1000 /var/www/resolve_django/media
sudo chown -R 1000:1000 /var/www/resolve_django/static

# Ou com permissões gerais
chmod 755 /var/www/resolve_django/media
chmod 755 /var/www/resolve_django/static
```

### Erro de banco de dados
```bash
# Verificar integridade do DB
cd /var/www/resolve_django
python manage.py dbshell

# Fazer backup e recriar
mv db.sqlite3 db.sqlite3.corrupted
docker exec resolve_django_app python manage.py migrate
```

---

## 📊 Monitoramento

### Ver status do container
```bash
docker stats resolve_django_app
```

### Ver logs em tempo real
```bash
docker logs -f resolve_django_app
```

### Logs do Nginx Proxy Manager
```bash
tail -f /data/logs/proxy-host-6_access.log
tail -f /data/logs/proxy-host-6_error.log
```

---

## 🔄 Rollback (Voltar à Configuração Anterior)

Se precisar voltar:

```bash
# 1. Parar o container Django
docker-compose -f /var/www/resolve_django/docker-compose.yml down

# 2. Restaurar configuração do Nginx
cp /root/backups/6.conf.backup.* /data/nginx/proxy_host/6.conf

# 3. Recarregar Nginx
docker exec default_npm_1 nginx -s reload

# 4. Restaurar projeto anterior
tar -xzf /root/backups/eng-tools-forge.backup.*.tar.gz -C /var/www/
```

---

## ✅ Checklist Pré-Deploy

- [ ] Backup feito
- [ ] Django funciona localmente (`manage.py check`)
- [ ] requirements.txt atualizado
- [ ] settings.py com ALLOWED_HOSTS corretos
- [ ] Rede docker npm-network existe
- [ ] Dados do banco estão seguros
- [ ] Static files e media directory têm permissões corretas

---

## 🚀 Comando Rápido (All-in-one)

Se tudo tiver sido validado:

```bash
cd /var/www/resolve_django && \
docker-compose down 2>/dev/null; \
docker build -t resolve-django:latest . && \
docker-compose up -d && \
echo "✅ Container iniciado!" && \
sleep 5 && \
docker exec default_npm_1 nginx -t && \
docker exec default_npm_1 nginx -s reload && \
echo "✅ Nginx recarregado!" && \
echo "✅ Deploy concluído!" && \
echo "" && \
echo "Testando..." && \
curl -I https://resolve.eng.br
```

---

## 📝 Notas Importantes

1. **Variáveis de Ambiente**: O `.env` será carregado do projeto Django automaticamente
2. **Static Files**: São coletados automaticamente no boot via `collectstatic`
3. **Database**: Usa SQLite (db.sqlite3) - para produção considere PostgreSQL
4. **Workers Gunicorn**: Configurados para 4 workers - ajuste conforme necessário
5. **Timeout**: Configurado para 60 segundos - aumente se processos forem longos

---

**Última atualização:** 2025-11-20
**Versão:** 1.0
