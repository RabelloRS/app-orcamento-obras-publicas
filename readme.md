Prompt inicial para novos aplicativos:

"Estou trabalhando num projeto Django (Monólito Modular) voltado para engenharia. Preciso que você compreenda o projeto e me ajude a desenvolver/ corrigir algo. Forneço os seguintes detalhes do ambiente e do repositório:

Resumo: Projeto Django monolito modular com front híbrido (Django Templates + Vue 3 via CDN) e Bootstrap 5. A pasta de configuração global é setup.
Estrutura principal:
manage.py
setup (contém settings.py, urls.py)
templates (global base.html)
usuarios (app de autenticação)
ferramenta_drenagem (app de exemplo já implementado)
Stack:
Python: 3.11.9
Django: 5.2.8
Dependências: requirements.txt gerado (contém Django, asgiref, sqlparse, tzdata, etc.)
Banco: SQLite (arquivo db.sqlite3 na raiz)
Sistema: Windows (PowerShell disponível)
Virtualenv: .venv na raiz (ativação Windows: Activate)
Como rodar localmente (comandos que funcionam no meu ambiente Windows):
Activate
python [manage.py](http://_vscodecontentref_/14) migrate
python [manage.py](http://_vscodecontentref_/15) runserver 8001
Controle de versão:
Repositório remoto: GitHub RabelloRS/DJANGO (branch padrão: main)
origin configurado via SSH (git@github.com:RabelloRS/DJANGO.git)
Resolve — Monólito Django para ferramentas de engenharia

Resumo
- Projeto Django modular (monólito) com apps por funcionalidade: `ferramenta_drenagem`, `ferramenta_mapa`, `mapa_fotos`, `usuarios`.
- Frontend híbrido: Django Templates + Vue 3 via CDN e Bootstrap 5.

Propósito deste README
- Fornecer onboarding rápido e específico para agentes IA e desenvolvedores que acessam o repositório pela primeira vez.

Arquitetura e organização
- Configurações centrais: `setup/settings.py` e roteamento global em `setup/urls.py`.
- Entrypoint: `manage.py`.
- Templates globais em `templates/` e templates por app em `*/templates/<app_name>/`.
- Uploads e mídia em `media/` (ex.: `media/photos`). Banco local: `db.sqlite3`.

Requisitos (versões observadas)
- Python 3.11.x
- Django 5.2.x
- Dependências listadas em `requirements.txt`

Quickstart (Linux / macOS)
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # opcional
python manage.py runserver
```

Quickstart (Windows PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Testes
- Rodar todos: `python manage.py test`
- Isolar um app: `python manage.py test mapa_fotos`

Padrões e convenções do projeto
- Frontend: usar Vue 3 via CDN (sem build tools) e Bootstrap 5. Mantemos páginas simples com Vue injetado onde necessário.
- Templates: manter a estrutura por app (ex.: `mapa_fotos/templates/mapa_fotos/upload.html`).
- Migrations: antes de aplicar, execute `python manage.py makemigrations <app>` e revise as mudanças.

Integrações e pontos-chave para inspecionar
- `setup/settings.py`: variáveis de `MEDIA_ROOT`, `STATIC_ROOT`, `ALLOWED_HOSTS`.
- `setup/urls.py`: inclusão das `urls.py` de cada app.
- `mapa_fotos/models.py` e campos `ImageField`/`FileField` para referência de uploads.
- `ferramenta_mapa/views.py`, `mapa_fotos/views.py`, `ferramenta_drenagem/views.py`: exemplos de padrões `render(...)` e tratamento de formulários.

Como preparar solicitações úteis para um agente IA
- Forneça sempre:
	- Objetivo claro (o que implementar/arrumar).
	- Critérios de aceite (o que significa "pronto").
	- Passos exatos para reproduzir (para bugs), incluindo tracebacks.
	- Branch alvo e permissão explícita para commits/push automáticos (se desejar).
- Exemplo mínimo de prompt:
	- Objetivo: "Adicionar endpoint JSON `/api/calculo_vigas/` que retorne momento fletor"
	- Critério: endpoint retorna `{'moment': <float>, 'reacoes': [...]}` e testes em `tests.py` passam.

Controle de versão e fluxo de trabalho recomendado
- Branch padrão: `main` (repo remoto: https://github.com/RabelloRS/DJANGO).
- Recomenda-se criar branches `feature/*` ou `bugfix/*` e abrir PRs para revisão. Solicite autorização explícita antes de permitir commits/push automáticos pelo agente.

Notas específicas (corrigidas do arquivo anterior)
- Removidas referências internas do VS Code e instruções exclusivas para Windows. O repositório pode ser executado em Linux/macOS e Windows.
- Observação: o `origin` pode usar HTTPS ou SSH — confirme localmente (`git remote -v`).

Próximo passo
- Se quiser, aplico uma versão em inglês, adiciono exemplos de testes unitários ou crio um PR em vez de commit direto.
