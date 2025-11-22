# Resolve Django – Ferramentas de Engenharia

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
origin configurado via SSH (<https://github.com/RabelloRS/DJANGO.git>)
Resolve — Monólito Django para ferramentas de engenharia

## Resumo

- Projeto Django modular (monólito) com apps por funcionalidade: `ferramenta_drenagem`, `ferramenta_mapa`, `mapa_fotos`, `usuarios`.
- Frontend híbrido: Django Templates + Vue 3 via CDN e Bootstrap 5.

Propósito deste README

- Fornecer onboarding rápido e específico para agentes IA e desenvolvedores que acessam o repositório pela primeira vez.

Arquitetura e organização

- Configurações centrais: `setup/settings.py` e roteamento global em `setup/urls.py`.
- Entrypoint: `manage.py`.
- Templates globais em `templates/` e templates por app em `*/templates/<app_name>/`.
- Uploads e mídia em `media/` (ex.: `media/photos`). Banco local: `db.sqlite3`.
- Apps ativos principais:
  - `usuarios` (autenticação, login/logout, dashboard)
  - `ferramenta_drenagem` (cálculo hidráulico + módulo IDFGeo)
  - `mapa_fotos` (upload e visualização de fotos georreferenciadas)
  - `ferramenta_mapa` (infra para visualização de mapas genéricos)
  - Arquivados de referência ficam em `archived_apps/` (não usar para novas features)

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
- Testes do módulo IDFGeo incluídos em `ferramenta_drenagem/tests.py` (cobrem rota principal e redirect)

## Padrões e convenções do projeto

- Frontend: usar Vue 3 via CDN (sem build tools) e Bootstrap 5. Mantemos páginas simples com Vue injetado onde necessário.
- Templates: manter a estrutura por app (ex.: `mapa_fotos/templates/mapa_fotos/upload.html`).
- Novo layout unificado: todas as páginas migrando para `layouts/app.html` utilizando design system em `static/css/tokens.css` e `static/css/layout.css`.
- Classe utilitária `full-visual` aplicada para páginas de mapa em tela cheia (ex.: IDFGeo) para remover padding e permitir imersão.
- Migrations: antes de aplicar, execute `python manage.py makemigrations <app>` e revise as mudanças.

## Integrações e pontos-chave para inspecionar

- `setup/settings.py`: variáveis de `MEDIA_ROOT`, `STATIC_ROOT`, `ALLOWED_HOSTS`.
- `setup/urls.py`: inclusão das `urls.py` de cada app.
- `mapa_fotos/models.py` e campos `ImageField`/`FileField` para referência de uploads.
- `ferramenta_mapa/views.py`, `mapa_fotos/views.py`, `ferramenta_drenagem/views.py`: exemplos de padrões `render(...)` e tratamento de formulários.
### Módulo IDFGeo (Mapa de Equações de Chuva)

Lista de referências principais:

- Template: `ferramenta_drenagem/templates/drenagem/idfgeo.html`
- View: `ferramenta_drenagem.views.idfgeo`
- URL canônica: `/drenagem/idfgeo/` (atalho `/idfgeo/` faz redirect via `setup/urls.py`)
- Frontend: Leaflet (CDN), Tailwind (CDN), ícones Lucide — todos via `<script>`/`<link>` sem build.
- Assets JS: `static/ferramenta_drenagem/idfgeo/` (ex.: `app.js`, `idw_worker.js`).
- Objetivo: visualização espacial de coeficientes (K / expoente) das equações IDF para o RS.

## Layout Unificado e Design System

O projeto adota um pequeno design system baseado em CSS custom properties:

- `tokens.css`: define cores, espaçamentos, tipografia e sombras.
- `layout.css`: grid principal (`sidebar` + área de conteúdo), classes utilitárias (`.full-visual`) e responsividade (mobile e ultrawide).
- `layout-init.js`: inicializa tooltips Bootstrap, alternância de tema (light/dark) e colapso da sidebar.

Migração de templates:

1. Substituir `{% extends 'base.html' %}` / `base_public.html` / `base_authenticated.html` por `{% extends 'layouts/app.html' %}`.
2. Trocar containers antigos (`container`, `container-lg`) por `ds-container` onde for conteúdo padrão.
3. Para páginas de visualização (mapas, gráficos em tela cheia), adicionar bloco `body_classes` com `full-visual` ou envolver conteúdo conforme necessário.
4. Mover estilos específicos para blocos `extra_css` em vez de inline quando possível.
5. Scripts adicionais ficam em `extra_js` mantendo inicialização global intacta.

Página piloto: `usuarios/dashboard_new.html` (já aplicada). Dashboard principal migrado para novo padrão.

Próximas melhorias possíveis:

- Unificar componentes de cartão em partials reutilizáveis.
- Criar classe utilitária para painéis (substituir estilos inline recorrentes).
- Adicionar tokens de modo alto contraste.
- Documentar acessibilidade (atalhos, ARIA) em seção futura.

## Como preparar solicitações úteis para um agente IA

- Forneça sempre:
  - Objetivo claro (o que implementar/arrumar).
  - Critérios de aceite (o que significa "pronto").
  - Passos exatos para reproduzir (para bugs), incluindo tracebacks.
  - Branch alvo e permissão explícita para commits/push automáticos (se desejar).
- Exemplo mínimo de prompt:
  - Objetivo: "Adicionar endpoint JSON `/api/calculo_vigas/` que retorne momento fletor"
  - Critério: endpoint retorna `{"moment": <float>, "reacoes": [...]}` e testes em `tests.py` passam.

## Controle de versão e fluxo de trabalho recomendado

- Branch padrão: `main` (repo remoto: <https://github.com/RabelloRS/DJANGO>).
- Recomenda-se criar branches `feature/*` ou `bugfix/*` e abrir PRs para revisão. Solicite autorização explícita antes de permitir commits/push automáticos pelo agente.

## Notas específicas (corrigidas do arquivo anterior)

- Removidas referências internas do VS Code e instruções exclusivas para Windows. O repositório pode ser executado em Linux/macOS e Windows.
- Observação: o `origin` pode usar HTTPS ou SSH — confirme localmente (`git remote -v`).

## Próximo passo

- Se quiser, aplico uma versão em inglês, adiciono exemplos de testes unitários ou crio um PR em vez de commit direto.
- Para IDFGeo: solicitar melhorias (ex.: export CSV/PDF, interpolação extra, camadas adicionais) indicando fórmula esperada e forma de validação.
