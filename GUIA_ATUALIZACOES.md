# 📚 Guia de Atualizações - resolve.eng.br Django

**Última atualização:** 20 de Novembro de 2025  
**Versão:** 1.0

---

## 📋 Índice Rápido

1. [Antes de Atualizar](#antes-de-atualizar)
2. [Atualizar Código da Aplicação](#atualizar-código-da-aplicação)
3. [Adicionar Novas Dependências](#adicionar-novas-dependências)
4. [Atualizar Django](#atualizar-django)
5. [Trocar de Hardware/Servidor](#trocar-de-hardwareservidor)
6. [Troubleshooting](#troubleshooting)
7. [Rollback (Voltar Atrás)](#rollback-voltar-atrás)

---

## ⚠️ Antes de Atualizar

### Sempre seguir este checklist ANTES de qualquer mudança:

```bash
# 1. Fazer backup completo
mkdir -p /root/backups/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups/$(date +%Y%m%d_%H%M%S)"

# Backup do banco de dados
cp /var/www/resolve_django/db.sqlite3 $BACKUP_DIR/

# Backup do código
tar -czf $BACKUP_DIR/resolve_django_code.tar.gz /var/www/resolve_django/

# Backup da configuração Nginx
cp /etc/nginx/sites-enabled/nginx-resolve.eng.br.conf $BACKUP_DIR/

# Backup das variáveis de ambiente
cp /var/www/resolve_django/.env $BACKUP_DIR/

echo "✅ Backup criado em: $BACKUP_DIR"
```

### Verificar saúde da aplicação

```bash
# Verificar container
docker ps | grep resolve_django_app

# Verificar logs recentes
docker logs --tail 50 resolve_django_app

# Verificar acesso externo
curl -I https://resolve.eng.br/inicio/

# Verificar espaço em disco
df -h /var/www
df -h /
```

---

## 🔄 Atualizar Código da Aplicação

### Cenário 1: Atualizar apenas arquivos estáticos (CSS, JS, Templates)

```bash
# 1. Parar o container
cd /var/www/resolve_django
docker-compose down

# 2. Fazer upload dos novos arquivos
# (Use Git, SCP, ou outro método)
git pull origin main

# 3. Recriar container
docker-compose up -d

# 4. Coletar static files
docker exec resolve_django_app python manage.py collectstatic --noinput

# 5. Testar
curl -I https://resolve.eng.br/inicio/
```

### Cenário 2: Atualizar código Python (views, models, etc)

```bash
# 1. Backup
mkdir -p /root/backups/$(date +%Y%m%d_%H%M%S)
cp /var/www/resolve_django/db.sqlite3 /root/backups/$(date +%Y%m%d_%H%M%S)/

# 2. Atualizar código (Git)
cd /var/www/resolve_django
git pull origin main

# 3. Rebuild e restart
docker-compose down
docker rmi resolve_django_resolve-django:latest  # Remove imagem antiga
docker build -t resolve-django:latest .
docker-compose up -d

# 4. Aplicar migrações (se houver)
docker exec resolve_django_app python manage.py migrate

# 5. Coletar static files
docker exec resolve_django_app python manage.py collectstatic --noinput

# 6. Testar
sleep 5
curl -I https://resolve.eng.br/inicio/
docker logs -f resolve_django_app
```

### Cenário 3: Atualizar com novo modelo de banco de dados

```bash
# ⚠️ IMPORTANTE: Isso modifica o banco de dados!

# 1. Fazer backup duplo!
cp /var/www/resolve_django/db.sqlite3 /root/backups/db.sqlite3.backup.$(date +%Y%m%d_%H%M%S)
cp /var/www/resolve_django/db.sqlite3 /root/backups/db.sqlite3.backup.seguro

# 2. Atualizar código
cd /var/www/resolve_django
git pull origin main

# 3. Criar migrations
docker-compose up -d
docker exec resolve_django_app python manage.py makemigrations

# 4. Aplicar migrations
docker exec resolve_django_app python manage.py migrate

# 5. Testar
docker logs resolve_django_app

# Se der erro, restaurar:
docker exec resolve_django_app python manage.py migrate [app_name] [numero_migracao_anterior]
```

---

## ➕ Adicionar Novas Dependências

### Se precisa instalar novo pacote Python

```bash
# 1. Adicionar ao requirements.txt
echo "seu-novo-pacote==1.0.0" >> /var/www/resolve_django/requirements.txt

# 2. Verificar o arquivo
cat /var/www/resolve_django/requirements.txt

# 3. Rebuild da imagem
cd /var/www/resolve_django
docker-compose down
docker rmi resolve_django_resolve-django:latest
docker build -t resolve-django:latest .

# 4. Restart
docker-compose up -d

# 5. Testar
docker logs resolve_django_app
curl -I https://resolve.eng.br/inicio/
```

### Se precisa adicionar variáveis de ambiente

```bash
# 1. Editar .env
nano /var/www/resolve_django/.env

# Adicionar:
# NOVA_VARIAVEL=valor

# 2. Rebuild
cd /var/www/resolve_django
docker-compose restart

# 3. Verificar
docker exec resolve_django_app python -c "import os; print(os.getenv('NOVA_VARIAVEL'))"
```

---

## 🚀 Atualizar Django

### Atualizar para versão menor do Django (ex: 5.2.8 → 5.2.9)

```bash
# 1. Backup
cp /var/www/resolve_django/db.sqlite3 /root/backups/db.sqlite3.backup.$(date +%Y%m%d_%H%M%S)

# 2. Atualizar requirements.txt
sed -i 's/Django==5.2.8/Django==5.2.9/' /var/www/resolve_django/requirements.txt

# 3. Rebuild
cd /var/www/resolve_django
docker-compose down
docker rmi resolve_django_resolve-django:latest
docker build -t resolve-django:latest .

# 4. Restart
docker-compose up -d

# 5. Testar
sleep 5
docker logs resolve_django_app
curl -I https://resolve.eng.br/inicio/
```

### Atualizar para versão maior do Django (ex: 5.2.x → 6.0.x) ⚠️ CUIDADO!

```bash
# ⚠️ FAZER BACKUP TRIPLO!
cp /var/www/resolve_django/db.sqlite3 /root/backups/db.sqlite3.backup.django_major_$(date +%Y%m%d_%H%M%S)
cp /var/www/resolve_django/db.sqlite3 /root/backups/db.sqlite3.backup.django_major_$(date +%Y%m%d_%H%M%S).bak2

# 1. Ler documentação de migração
# Acessar: https://docs.djangoproject.com/en/6.0/releases/6.0/

# 2. Atualizar requirements.txt
sed -i 's/Django==5.2.8/Django==6.0.0/' /var/www/resolve_django/requirements.txt

# 3. Atualizar dependências relacionadas
# (Pode quebrar compatibilidade com pacotes)
echo "Revisar manualmente compatibilidade de pacotes"

# 4. Rebuild
cd /var/www/resolve_django
docker-compose down
docker rmi resolve_django_resolve-django:latest
docker build -t resolve-django:latest .

# 5. Teste em container
docker-compose up -d

# 6. Executar checks
docker exec resolve_django_app python manage.py check

# 7. Aplicar migrações
docker exec resolve_django_app python manage.py migrate

# 8. Testar funcionalidades críticas
curl -I https://resolve.eng.br/inicio/
docker logs resolve_django_app

# ⚠️ Se tudo falhar, restaurar do backup (ver seção Rollback)
```

---

## 🔧 Trocar de Hardware/Servidor

### Se está migrando para novo servidor

```bash
# ========== NO SERVIDOR ANTIGO ==========

# 1. Fazer backup completo
BACKUP_DIR="/root/backups/migracao_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 2. Backup do banco
cp /var/www/resolve_django/db.sqlite3 $BACKUP_DIR/

# 3. Backup do código
tar -czf $BACKUP_DIR/resolve_django_completo.tar.gz /var/www/resolve_django/

# 4. Backup das configs Nginx
cp /etc/nginx/sites-enabled/nginx-resolve.eng.br.conf $BACKUP_DIR/
cp /data/nginx/conf.d/include/proxy.conf $BACKUP_DIR/

# 5. Backup de variáveis sensíveis
cp /var/www/resolve_django/.env $BACKUP_DIR/

# 6. Exportar informações importantes
echo "=== INFORMAÇÕES DO SISTEMA ===" > $BACKUP_DIR/info.txt
docker ps | grep resolve_django_app >> $BACKUP_DIR/info.txt
docker images | grep resolve >> $BACKUP_DIR/info.txt
echo "" >> $BACKUP_DIR/info.txt
echo "=== VERSÕES ===" >> $BACKUP_DIR/info.txt
docker exec resolve_django_app python --version >> $BACKUP_DIR/info.txt
docker exec resolve_django_app django-admin --version >> $BACKUP_DIR/info.txt

# 7. Transferir backup (SCP)
scp -r $BACKUP_DIR usuario@novo_servidor:/root/backups/

echo "✅ Backup pronto para migração"
```

### No novo servidor

```bash
# ========== NO NOVO SERVIDOR ==========

# 1. Preparar ambiente (assumindo Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y docker.io docker-compose nginx git

# 2. Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker

# 3. Criar rede Docker
docker network create npm-network

# 4. Restaurar arquivos
cd /root/backups/migracao_*/
tar -xzf resolve_django_completo.tar.gz

# 5. Restaurar banco de dados
cp db.sqlite3 /var/www/resolve_django/

# 6. Restaurar configuração Nginx
sudo cp nginx-resolve.eng.br.conf /etc/nginx/sites-enabled/

# 7. Restaurar variáveis de ambiente
cp .env /var/www/resolve_django/

# 8. Rebuild Docker
cd /var/www/resolve_django
docker build -t resolve-django:latest .

# 9. Iniciar container
docker-compose up -d

# 10. Verificar
docker ps | grep resolve_django_app
curl -I https://resolve.eng.br/inicio/

# 11. Se DNS ainda aponta para servidor antigo, testar com IP:
curl -k -I -H "Host: resolve.eng.br" https://novo_ip/
```

### Se precisa mudar de `docker` para outro container runtime

```bash
# 1. Exportar banco de dados em SQL (mais portável)
docker exec resolve_django_app python manage.py dumpdata > /root/backups/db_dump.json

# 2. Se mudar para Podman, processo é similar
# 3. Simplesmente usar `podman` ao invés de `docker`
podman build -t resolve-django:latest .
podman-compose up -d
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver erro detalhado
docker logs resolve_django_app

# Se for erro de permissão:
sudo chown -R 1000:1000 /var/www/resolve_django/

# Se for porta em uso:
lsof -i :8000
# Matar processo ou mudar porta no docker-compose.yml

# Verificar integridade do banco
docker exec resolve_django_app python manage.py dbshell ".tables"
```

### Aplicação lenta ou travando

```bash
# Ver uso de recursos
docker stats resolve_django_app

# Aumentar workers do Gunicorn em docker-compose.yml:
# Mudar: gunicorn ... --workers 4
# Para: gunicorn ... --workers 8

# Aumentar timeout
# Mudar: --timeout 60
# Para: --timeout 300

# Rebuild
docker-compose down
docker build -t resolve-django:latest .
docker-compose up -d
```

### Erro de Static Files não sendo servidos

```bash
# Coletar novamente
docker exec resolve_django_app python manage.py collectstatic --noinput --clear

# Verificar permissões
docker exec resolve_django_app ls -la /app/staticfiles/

# Verificar STATIC_ROOT em settings.py
docker exec resolve_django_app grep -i "STATIC_ROOT" manage.py
```

### Erro de banco de dados corrompido

```bash
# Backup do arquivo corrompido
cp /var/www/resolve_django/db.sqlite3 /var/www/resolve_django/db.sqlite3.corrompido

# Restaurar do backup
cp /root/backups/db.sqlite3.backup.TIMESTAMP /var/www/resolve_django/db.sqlite3

# Restart
docker-compose restart

# Verificar
docker exec resolve_django_app python manage.py check
```

---

## ↩️ Rollback (Voltar Atrás)

### Se algo deu errado, fazer rollback rápido

```bash
# ========== OPÇÃO 1: Voltar última versão Docker ==========

# 1. Parar container atual
cd /var/www/resolve_django
docker-compose down

# 2. Restaurar código anterior
cd /root/backups/
ls -la | grep resolve_django_code
tar -xzf resolve_django_code.tar.gz -C /

# 3. Restaurar banco de dados
cp /root/backups/db.sqlite3.backup.TIMESTAMP /var/www/resolve_django/db.sqlite3

# 4. Rebuild
cd /var/www/resolve_django
docker build -t resolve-django:latest .

# 5. Restart
docker-compose up -d

# 6. Verificar
sleep 5
curl -I https://resolve.eng.br/inicio/
```

```bash
# ========== OPÇÃO 2: Voltar para Git commit anterior ==========

# 1. Ver histórico
cd /var/www/resolve_django
git log --oneline | head -10

# 2. Voltar para commit anterior
git reset --hard abc1234def  # Use o hash do commit

# 3. Rebuild
docker-compose down
docker rmi resolve_django_resolve-django:latest
docker build -t resolve-django:latest .
docker-compose up -d

# 4. Verificar
curl -I https://resolve.eng.br/inicio/
```

```bash
# ========== OPÇÃO 3: Restaurar banco de dados apenas ==========

# 1. Parar container
docker-compose down

# 2. Restaurar DB
cp /root/backups/db.sqlite3.backup.SEGURO /var/www/resolve_django/db.sqlite3

# 3. Restart
docker-compose up -d

# 4. Verificar
docker logs resolve_django_app
```

---

## 📊 Checklist para Nova Versão

Use este checklist sempre que fazer uma atualização:

```bash
# Pré-atualização
☐ Backup de banco de dados
☐ Backup de código
☐ Backup de configurações
☐ Documentar versão atual
☐ Anotar últimas alterações

# Durante atualização
☐ Atualizar código/dependências
☐ Testar localmente se possível
☐ Build da imagem Docker
☐ Restart do container
☐ Aplicar migrações (se necessário)
☐ Coletar static files

# Pós-atualização
☐ Verificar logs
☐ Testar página principal
☐ Testar funcionalidades críticas
☐ Verificar performance
☐ Atualizar documentação
☐ Arquivar backup com rótulo

# Monitoramento (próximas 24h)
☐ Acompanhar logs
☐ Verificar erros recorrentes
☐ Testar de diferentes navegadores
☐ Testar em mobile
```

---

## 🚨 Emergência - Colocar Site Offline Rapidamente

Se precisa tirar o site do ar emergencialmente:

```bash
# Opção 1: Parar container
docker-compose down

# Opção 2: Disable no Nginx
sudo mv /etc/nginx/sites-enabled/nginx-resolve.eng.br.conf /etc/nginx/sites-disabled/
sudo nginx -s reload

# Opção 3: Colocar página de manutenção
# Criar /var/www/resolve_django/maintenance.html
# E modificar Nginx para servir esse arquivo

# Para voltar online:
docker-compose up -d
# ou
sudo mv /etc/nginx/sites-disabled/nginx-resolve.eng.br.conf /etc/nginx/sites-enabled/
sudo nginx -s reload
```

---

## 📞 Contatos e Recursos

**Documentação:**
- [Django Official Docs](https://docs.djangoproject.com/)
- [Gunicorn Docs](https://gunicorn.org/)
- [Docker Docs](https://docs.docker.com/)
- [Nginx Docs](https://nginx.org/en/docs/)

**Arquivos Importantes:**
```
/var/www/resolve_django/           # Código da aplicação
/var/www/resolve_django/.env        # Variáveis de ambiente
/var/www/resolve_django/Dockerfile  # Imagem Docker
/etc/nginx/sites-enabled/nginx-resolve.eng.br.conf  # Config Nginx
/root/backups/                      # Backups
```

**Comandos Frequentes:**
```bash
# Ver logs
docker logs -f resolve_django_app

# Reiniciar
docker-compose restart

# Status
docker ps | grep resolve

# Shell Django
docker exec -it resolve_django_app python manage.py shell

# Executar comando
docker exec resolve_django_app python manage.py [comando]
```

---

## 📝 Changelog

### v1.0 - 20/11/2025
- Guia inicial criado
- Procedimentos de backup documentados
- Guia de atualização de código
- Procedimentos de rollback
- Troubleshooting comum

---

**Última revisão:** 20 de Novembro de 2025  
**Próxima revisão recomendada:** Quando do próximo deploy
