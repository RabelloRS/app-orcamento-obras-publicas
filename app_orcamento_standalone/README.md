# 📊 Sistema de Orçamento de Obras Públicas

Sistema completo para gerenciamento de orçamentos de obras públicas, com suporte a importação de dados oficiais do **SINAPI** (Caixa Econômica Federal) e **SICRO** (DNIT).

## 🚀 Tecnologias

| Componente | Tecnologia |
|------------|------------|
| Backend | FastAPI (Python 3.10+) |
| Banco de Dados | PostgreSQL |
| ORM | SQLAlchemy (Async) |
| Frontend | Vue.js 3 (CDN) + Tailwind CSS |
| Autenticação | JWT (JSON Web Tokens) |

## ✨ Funcionalidades

### Gerenciamento de Projetos e Orçamentos

- Criar, editar e excluir projetos
- Criar, editar e excluir orçamentos
- Adicionar itens ao orçamento da base SINAPI/SICRO
- Edição inline de quantidade e BDI
- Cálculo automático de totais

### Importação de Dados

- **SINAPI**: Upload de arquivos ZIP diretamente
- **SICRO**: Sincronização automática com site do DNIT
- Listagem automática de meses disponíveis do DNIT
- Verificação de duplicidade (não cria itens já existentes)
- Suporte a importação incremental

### Proteção de Dados - REGRA MAGNA

- Itens de bases oficiais (SINAPI/SICRO) são **IMUTÁVEIS**
- Campo `is_locked` bloqueia edições
- Trigger PostgreSQL para proteção adicional
- Para editar: crie uma "Composição Própria" (cópia)

### Composições Próprias

- Copiar composições oficiais para edição livre
- Cada tenant tem suas próprias composições
- Fonte marcada como "PRÓPRIA"

### Segurança

- Multi-tenant (isolamento por empresa)
- Controle de acesso baseado em roles (OWNER, ADMIN, USER)
- Soft delete com auditoria completa
- Rate limiting para proteção contra abuso

## 📁 Estrutura do Projeto

```
APP_ORCAMENTO/
├── auth/                    # Autenticação JWT
│   ├── router.py           # Endpoints de login/registro
│   └── dependencies.py     # Dependências de segurança
├── routers/                 # Endpoints da API
│   ├── budgets.py          # Orçamentos e itens
│   ├── catalog.py          # Catálogo e composições próprias
│   ├── data.py             # Busca de itens
│   ├── projects.py         # Projetos
│   ├── analytics.py        # Análises
│   ├── export.py           # Exportação Excel
│   └── memorials.py        # Memoriais descritivos
├── services/               # Lógica de negócio
│   ├── importer.py         # Importação SINAPI/SICRO
│   └── limiter.py          # Rate limiting
├── migrations/             # Scripts de migração SQL
├── scripts/                # Scripts utilitários e de migração
├── tests/                  # Testes automatizados
├── static/                 # Frontend
│   ├── app/views/          # Componentes Vue.js
│   └── js/                 # Scripts principais
├── main.py                 # Entry point FastAPI
├── models.py               # Modelos SQLAlchemy
├── database.py             # Configuração do banco
├── settings.py             # Configurações
└── requirements.txt        # Dependências Python
```

## 🛠️ Instalação

### Pré-requisitos

- Python 3.10+
- PostgreSQL 13+
- Node.js (opcional, para desenvolvimento frontend)

### Passos

1. **Clonar o repositório**

```bash
git clone https://github.com/RabelloRS/APP_ORCAMENTO.git
cd APP_ORCAMENTO
```

2. **Criar ambiente virtual**

```bash
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

3. **Instalar dependências**

```bash
pip install -r requirements.txt
```

4. **Configurar banco de dados**

Crie um arquivo `.env` na raiz:

```env
DATABASE_URL=postgresql+asyncpg://usuario:senha@localhost:5432/orcamento_db
SECRET_KEY=sua_chave_secreta_aqui
```

5. **Inicializar banco de dados**

```bash
python scripts/init_db.py
python scripts/run_migration.py
python scripts/create_admin.py
```

6. **Executar o servidor**

```bash
python -m uvicorn main:app --reload --port 8000
```

7. **Acessar o sistema**

- Interface: <http://127.0.0.1:8000/static/app.html>
- API Docs: <http://127.0.0.1:8000/docs>

## 📚 API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/token` | Login (retorna JWT) |
| POST | `/api/v1/auth/register` | Registro de usuário |

### Projetos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/projects` | Listar projetos |
| POST | `/api/v1/projects` | Criar projeto |
| DELETE | `/api/v1/projects/{id}` | Excluir projeto |

### Orçamentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/budgets/project/{id}` | Listar orçamentos do projeto |
| POST | `/api/v1/budgets` | Criar orçamento |
| DELETE | `/api/v1/budgets/{id}` | Excluir orçamento |
| POST | `/api/v1/budgets/{id}/items` | Adicionar item |
| PATCH | `/api/v1/budgets/{id}/items/{item_id}` | Editar item |
| DELETE | `/api/v1/budgets/{id}/items/{item_id}` | Remover item |

### Catálogo

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/catalog/items/{id}` | Detalhes do item |
| PATCH | `/api/v1/catalog/items/{id}` | Editar (BLOQUEADO se oficial) |
| POST | `/api/v1/catalog/copy-to-custom/{id}` | Copiar para própria |
| GET | `/api/v1/catalog/custom` | Listar composições próprias |
| GET | `/api/v1/catalog/dnit/available-months` | Meses disponíveis DNIT |

### Importação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/data/import/sinapi` | Importar SINAPI (upload) |
| POST | `/api/v1/data/sync/sicro_start` | Importar SICRO (DNIT) |
| GET | `/api/v1/data/import/progress/{job_id}` | Status da importação |

## 🔒 Segurança

### Roles de Usuário

- **SUPER_ADMIN**: Acesso total ao sistema
- **OWNER**: Proprietário da empresa (tenant)
- **ADMIN**: Administrador da empresa
- **USER**: Usuário padrão

### Proteção de Dados Oficiais

```sql
-- Trigger que impede edição de itens oficiais
CREATE TRIGGER protect_reference_items
BEFORE UPDATE ON reference_items
FOR EACH ROW EXECUTE FUNCTION prevent_official_data_edit();
```

## 📊 Modelo de Dados

### Principais Entidades

- **Tenant**: Empresa/organização
- **User**: Usuário do sistema
- **Project**: Projeto de obra
- **ProjectBudget**: Orçamento do projeto
- **BudgetItem**: Item do orçamento
- **ReferenceItem**: Item de referência (SINAPI/SICRO)
- **ReferencePrice**: Preço do item por região/data
- **CustomComposition**: Composição própria do usuário

## 🤝 Contribuição

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'feat: Nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

*Desenvolvido com ❤️ para a engenharia civil brasileira.*
