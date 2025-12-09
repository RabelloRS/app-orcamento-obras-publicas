# 🔒 Configuração de Segurança

## 📋 Passos para Configuração Segura

### 1. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar o arquivo .env com valores reais
nano .env  # ou use seu editor preferido
```

### 2. Gerar SECRET_KEY Segura
```bash
# Gerar uma chave segura (Python)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Ou usando OpenSSL
openssl rand -hex 32
```

### 3. Configurações Recomendadas para Produção

#### No arquivo .env:
```env
# 🔒 SEGURANÇA (OBRIGATÓRIO)
SECRET_KEY=sua-chave-super-segura-minimo-32-caracteres-aqui

# 🗄️ BANCO DE DADOS
DATABASE_URL=postgresql+asyncpg://usuario:senha@servidor:5432/banco_producao

# ⏰ TOKENS JWT
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 🌐 CORS
ALLOWED_ORIGINS=https://seusite.com,https://app.seusite.com
```

### 4. Verificação de Segurança

#### Testar se as variáveis estão sendo carregadas:
```python
from settings import get_settings
settings = get_settings()
print(f"SECRET_KEY: {settings.SECRET_KEY}")
print(f"DATABASE_URL: {settings.DATABASE_URL}")
```

### 5. Boas Práticas de Produção

- **NUNCA** comitar o arquivo `.env` no git
- Usar diferentes SECRET_KEY para desenvolvimento e produção
- Rotar as chaves periodicamente em produção
- Usar variáveis de ambiente do servidor em produção

### 6. Comandos Úteis

```bash
# Verificar se o .env está sendo carregado
python -c "from settings import get_settings; print(get_settings().SECRET_KEY)"

# Gerar nova chave segura
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
```

## ⚠️ Alertas de Segurança

- ❌ **NUNCA** usar a SECRET_KEY padrão em produção
- ❌ **NUNCA** expor o arquivo .env publicamente
- ✅ Usar chaves diferentes para cada ambiente
- ✅ Rotar chaves periodicamente (a cada 3-6 meses)

## 🔐 Níveis de Segurança

### Desenvolvimento
- SECRET_KEY gerada localmente
- Banco local com dados de teste

### Homologação  
- SECRET_KEY diferente da produção
- Banco separado com dados de teste

### Produção
- SECRET_KEY complexa e única
- Banco dedicado com backup
- SSL obrigatório

---
*Última atualização: 2024-12-07*