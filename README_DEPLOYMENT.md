# Guia de Deploy

## Deploy Rápido (Mudanças Leves)

Use `deploy_fast.sh` para alterações apenas em templates, arquivos estáticos ou pequenos ajustes de view sem mudança em `requirements.txt` ou `Dockerfile`.

### Comandos

```bash
cd /var/www/resolve_django
./deploy_fast.sh --pull           # puxa alterações e faz restart simples
./deploy_fast.sh --dry-run --pull # simula e mostra decisões
./deploy_fast.sh --force-build    # força rebuild completo da imagem
```

### Critérios automáticos

- Se detectar mudanças em `requirements.txt`, `Dockerfile`, `setup/` ou opção `--force-build` → rebuild.
- Caso contrário → restart do container + collectstatic.

### Health-check

Health-check automático verifica `/inicio/` e reporta status HTTP.

### Rollback rápido

```bash
git reflog
git reset --hard <commit_anterior>
docker restart resolve_django_app
```

Para maior segurança (build completo + backups) continue usando `deploy.sh`.
# 📋 Resumo de Configuração - resolve.eng.br Django

**Data:** 20 de Novembro de 2025  
**Status:** ✅ Pronto para Deploy  

---

## 🎯 O que foi feito

### ✅ Configuração do Django
- [x] Atualizou `.env` para produção (DEBUG=False)
- [x] Adicionou domínios ao `ALLOWED_HOSTS`
- [x] Adicionado Gunicorn ao `requirements.txt`
- [x] Criado Dockerfile otimizado para Django

### ✅ Configuração Docker
- [x] Criado `Dockerfile` com Python 3.11
- [x] Criado `docker-compose.yml` com volumes corretos
- [x] Container conectado à rede `npm-network`
- [x] Migrations e collectstatic automáticos no boot

### ✅ Nginx Proxy Manager
- [x] Atualizado `/data/nginx/proxy_host/6.conf`
- [x] Apontando para container `resolve_django_app` porta 8000
- [x] SSL/TLS já configurado (Let's Encrypt)
- [x] Domínios: `resolve.eng.br` e `www.resolve.eng.br`

### ✅ Automação
- [x] Criado script `/deploy.sh` com todas as validações
- [x] Script faz backups automáticos
- [x] Validações pré e pós-deploy
- [x] Testes de conectividade

### ✅ Documentação
- [x] Guia completo de deploy (`DEPLOY_GUIDE.md`)
- [x] Comandos rápidos de referência (`QUICK_COMMANDS.md`)
- [x] Troubleshooting detalhado
- [x] Checklist pré-deploy

---

## 📦 Arquivos Criados/Modificados

```
/var/www/resolve_django/
├── ✅ Dockerfile                    (NOVO)
├── ✅ docker-compose.yml            (NOVO)
├── ✅ deploy.sh                     (NOVO - script de deploy)
├── ✅ DEPLOY_GUIDE.md              (NOVO - guia completo)
├── ✅ QUICK_COMMANDS.md            (NOVO - referência rápida)
├── ✅ .env                         (MODIFICADO - produção)
├── ✅ requirements.txt             (MODIFICADO - adicionado gunicorn)
└── 🔄 Existentes: manage.py, db.sqlite3, etc...

/data/nginx/proxy_host/
├── ✅ 6.conf                       (MODIFICADO - apontando para Django)

/root/backups/
└── (Backups serão criados ao executar deploy.sh)
```

---

## 🚀 Próximas Etapas

### ⚠️ ANTES DO DEPLOY

1. **Verificar Django localmente** (OBRIGATÓRIO)
   ```bash
   cd /var/www/resolve_django
   python manage.py check
   ```

2. **Verificar settings.py**
   - Confirmar que ALLOWED_HOSTS está correto
   - Verificar DATABASES (SQLite ou PostgreSQL)
   - Confirmar STATIC_ROOT e MEDIA_ROOT

3. **Testar build local** (Opcional)
   ```bash
   cd /var/www/resolve_django
   docker build -t resolve-django:test .
   ```

### ✅ EXECUTAR O DEPLOY

**Opção 1: Script Automatizado (RECOMENDADO)**
```bash
cd /var/www/resolve_django && ./deploy.sh
```

**Opção 2: Manual (passo a passo)**
```bash
cd /var/www/resolve_django
docker build -t resolve-django:latest .
docker-compose up -d
docker exec default_npm_1 nginx -s reload
```

### 🔍 APÓS O DEPLOY

1. **Verificar status**
   ```bash
   docker ps | grep resolve_django_app
   docker logs -f resolve_django_app
   ```

2. **Testar endpoint**
   ```bash
   curl -I https://resolve.eng.br
   ```

3. **Monitorar**
   ```bash
   docker stats resolve_django_app
   tail -f /data/logs/proxy-host-6_error.log
   ```

---

## 🔄 Configuração Atual (Será Migrada)

**Atual:**
- `resolve.eng.br` → `/var/www/eng-tools-forge/` (React/Vite estático)
- Servidor estático via `resolve-static`

**Novo (após deploy):**
- `resolve.eng.br` → Container Docker `resolve_django_app` 
- Django com Gunicorn na porta 8000
- Proxy reverso via Nginx

---

## 📊 Arquitetura Após Deploy

```
Internet (HTTPS - resolve.eng.br)
    ↓
Nginx Proxy Manager (porta 443)
    ↓
Nginx Proxy (default_npm_1)
    ↓
resolve_django_app (container)
    ↓
Django + Gunicorn (porta 8000)
    ↓
Banco de dados (SQLite/db.sqlite3)
```

---

## 🛠️ Tecnologias Utilizadas

| Componente | Versão | Função |
|-----------|--------|--------|
| Python | 3.11 | Runtime |
| Django | 5.2.8 | Framework Web |
| Gunicorn | 23.0.0 | Application Server |
| Docker | Latest | Containerização |
| Nginx | Latest | Proxy Reverso |
| Let's Encrypt | Auto | SSL/TLS |

---

## 📝 Notas Importantes

1. **Banco de dados:** Usando SQLite. Para grande volume, considerar PostgreSQL
2. **Static files:** Coletados automaticamente no boot
3. **Media files:** Montados como volume em `/var/www/resolve_django/media`
4. **Workers Gunicorn:** 4 workers (ajustar conforme CPU)
5. **SSL/TLS:** Gerenciado automaticamente pelo Nginx Proxy Manager
6. **Backups:** Recomenda-se fazer backups diários

---

## 🆘 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| 502 Bad Gateway | Verificar: `docker ps`, logs do container |
| Container não sobe | `docker logs resolve_django_app` |
| Permissão negada | `chown -R 1000:1000 /var/www/resolve_django/` |
| Nginx não recarrega | `docker exec default_npm_1 nginx -t` |
| Banco corrompido | Restaurar backup ou recriar migrations |

---

## 📞 Arquivos de Referência Rápida

```bash
# Deploy
cd /var/www/resolve_django && ./deploy.sh

# Ver logs
docker logs -f resolve_django_app

# Ver status
docker stats resolve_django_app

# Testar
curl -I https://resolve.eng.br

# Rollback
cp /root/backups/6.conf.backup.* /data/nginx/proxy_host/6.conf
docker exec default_npm_1 nginx -s reload
```

---

## ✅ Checklist Final

- [ ] Django check passou (`manage.py check`)
- [ ] `.env` está em produção (DEBUG=False)
- [ ] `requirements.txt` inclui Gunicorn
- [ ] Docker está rodando
- [ ] Rede `npm-network` existe
- [ ] Nginx config validada
- [ ] Script deploy.sh está executável
- [ ] Backups estão em `/root/backups/`
- [ ] Documentação lida e entendida

---

## 🎓 Próximos Passos Recomendados (Após Deploy)

1. **Monitoramento:** Configurar alertas para container
2. **Backup automático:** Criar cron job para backup diário
3. **CI/CD:** Considerar GitHub Actions para deploys automáticos
4. **Database:** Migrar de SQLite para PostgreSQL se necessário
5. **Performance:** Otimizar imagem Docker e cache

---

**Última atualização:** 2025-11-20  
**Status:** 🟢 Pronto para Deploy

---

## 🚀 COMANDO FINAL PARA INICIAR DEPLOY

```bash
cd /var/www/resolve_django && ./deploy.sh
```

Sim, é só isso! O script cuida de todo o resto. 😊
