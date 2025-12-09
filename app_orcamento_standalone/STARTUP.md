# Guia rápido para iniciar o sistema

> Ambiente: Windows + PowerShell + PostgreSQL + Python 3.10+ (venv em `venv/`).

## 1) Pré-requisitos
- PostgreSQL rodando e acessível (porta 5432 por padrão).
- Usuário do banco com permissão de criar DB.
- Redis opcional (para jobs/cache), apontado por `REDIS_URL`.

## 2) Configurar ambiente
```powershell
# na raiz do projeto
./venv/Scripts/Activate.ps1
# ou crie se não existir
python -m venv venv; ./venv/Scripts/Activate.ps1

# instalar dependências
python -m pip install -r requirements.txt
```

Crie o arquivo `.env` (ou confira existente):
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/orcamento_db
SECRET_KEY=<uma_chave_segura>
REDIS_URL=redis://localhost:6379/0
```

## 3) Preparar banco de dados

**Opção A: Setup rápido (banco já existe)**
```powershell
python scripts/init_db.py         # Cria banco e aplica schema_final.sql
python scripts/create_admin.py    # Cria admin@propor.eng.br / admin123
```

**Opção B: Reset completo (limpar tudo)**
```powershell
python scripts/reset_database.py  # Deleta banco, cria novo, aplica schema final
                                  # Já cria admin automaticamente
```

Banco está pronto! Todas as migrações já foram aplicadas em `schema_final.sql`.

## 5) Subir o servidor FastAPI
```powershell
# ainda com o venv ativo
python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

- Interface web: http://127.0.0.1:8080/static/app.html
- API docs: http://127.0.0.1:8080/docs
- Credenciais padrão: admin@propor.eng.br / admin123

## 6) Dicas & Troubleshooting

### Reiniciar do zero (limpar banco)
```powershell
python scripts/reset_database.py  # Deleta tudo e cria banco novo com schema final
```

### Erro de conexão DB
- Confirme `DATABASE_URL` no `.env`
- Verifique se PostgreSQL está rodando
- Confirme porta (padrão 5432)

### Erro "Could not import module main"
- Ative o venv: `./venv/Scripts/Activate.ps1`
- Instale dependências: `python -m pip install -r requirements.txt`

## 📋 Arquivos importantes

- `schema_final.sql` — Schema consolidado com TODAS as migrações aplicadas
- `scripts/apply_all_migrations.py` — Script para aplicar migrações (se precisar)
- `scripts/reset_database.py` — Reset completo do banco (com confirmação)
- `scripts/init_db.py` — Setup inicial (cria banco se não existir)
