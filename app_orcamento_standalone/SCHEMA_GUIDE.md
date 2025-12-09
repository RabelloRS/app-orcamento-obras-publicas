# Estrutura de Schema do Banco de Dados

## 📂 Arquivos de Schema

### `schema.sql`
- Schema **básico** da aplicação (compatibilidade para compatibilidade com antigas instalações)
- Não contém migrações
- **Não use este arquivo para novas instalações**

### `schema_final.sql` ⭐ (USE ESTE)
- Schema **consolidado** com TODAS as migrações (001-006) pré-aplicadas
- **Use este arquivo para:**
  - ✅ Novas instalações
  - ✅ Reinicializações do banco
  - ✅ Ambiente de desenvolvimento
  - ✅ Ambiente de produção

## 🔄 Como o schema_final.sql foi criado

1. **Schema base** (`schema.sql`) — tabelas principais
2. **001 - Data Immutability** — colunas `is_locked`, `is_official`, triggers
3. **002 - Performance Indexes** — índices GIN, GiST, compostos
4. **002 - WBS Hierarchy** — colunas de hierarquia em budget_items
5. **003 - BDI & Social Charges** — tabela `bdi_configurations`, coluna `social_charges_type`
6. **003 - Row Level Security** — políticas RLS para isolamento multi-tenant
7. **004 - Reference Price Types** — coluna `charge_type` em reference_prices
8. **005 - Soft Delete** — colunas `deleted_at`, `deleted_by_id`, `deleted_reason`, `restored_at`
9. **006 - Trash & Cascade** — metadados de lixeira, FK cascata

## 🚀 Scripts de Inicialização

### `scripts/init_db.py`
Cria o banco do zero e aplica `schema_final.sql`:
```powershell
python scripts/init_db.py
```

### `scripts/reset_database.py` (⚠️ DESTRUTIVO)
Deleta o banco existente e cria novo com `schema_final.sql`:
```powershell
python scripts/reset_database.py
```
Pede confirmação antes de deletar.

### `scripts/apply_all_migrations.py`
Aplica migrações em um banco existente (para compatibilidade):
```powershell
python scripts/apply_all_migrations.py
```

## 📋 Checklist para Novo Setup

```powershell
# 1. Ativar venv
./venv/Scripts/Activate.ps1

# 2. Instalar dependências
python -m pip install -r requirements.txt

# 3. Inicializar banco com schema_final.sql
python scripts/init_db.py

# 4. Criar admin (ou usa o padrão do reset_database.py)
python scripts/create_admin.py

# 5. Rodar servidor
python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

## 🔐 Segurança

### Row Level Security (RLS)
Ativado automaticamente no `schema_final.sql` para isolamento multi-tenant:
- **Projects** — isolados por `tenant_id`
- **Project Budgets** — isolados via project
- **Budget Items** — isolados via budget → project
- **Custom Compositions** — isolados por `tenant_id`
- **Users** — isolados por `tenant_id` (exceto super admin)

### Imutabilidade (REGRA MAGNA)
Dados oficiais (SINAPI/SICRO) são protegidos por:
- Colunas: `is_locked = TRUE`, `is_official = TRUE`
- Trigger: `prevent_official_data_edit()` bloqueia UPDATEs
- Alternativa: Criar "Composição Própria" (cópia editável)

## 💡 Quando usar cada arquivo

| Cenário | Use |
|---------|-----|
| Nova instalação | `schema_final.sql` + `init_db.py` |
| Reset completo | `reset_database.py` |
| Banco antigo (pre-final) | `apply_all_migrations.py` |
| Compatibilidade antigo | `schema.sql` |

## ✅ Verificação

Para confirmar que o banco está com o schema final:

```sql
-- Checar colunas de imutabilidade
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'reference_items' AND column_name IN ('is_locked', 'is_official');

-- Checar RLS ativado
SELECT tablename FROM pg_tables 
WHERE tablename IN ('projects', 'project_budgets') 
AND tablename IN (SELECT tablename FROM pg_tables WHERE schemaname='public');

-- Checar BDI config
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bdi_configurations');

-- Checar índices
SELECT count(*) FROM pg_indexes WHERE indexname LIKE 'idx_%';
```
