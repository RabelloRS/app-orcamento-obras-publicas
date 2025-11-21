<!-- Copilot / AI agent instructions for this Django project -->
# Copilot instructions — Projeto Django (Resolve)

## Propósito imediato
- Onboard agentes rapidamente: entender estrutura, comandos e deploy sem depender de contexto externo.

## Arquitetura e apps
- Monólito Django (Python 3.11.9 / Django 5.2.8) com apps por domínio: `ferramenta_drenagem`, `ferramenta_mapa`, `mapa_fotos`, `usuarios`; versões antigas ficam em `archived_apps/`.
- Configuração central em `setup/settings.py` (ALLOWED_HOSTS, MEDIA/STATIC roots, middlewares) e roteamento em `setup/urls.py`; entrypoint `manage.py`.
- Templates globais em `templates/` (ex.: `base.html`, `base_authenticated.html`) e templates por app em `*/templates/<app>/...`.
- Persistência padrão é SQLite (`db.sqlite3`); uploads são gravados em `media/` (ex.: `media/photos`).

## Frontend e padrões de código
- Layout Bootstrap 5 com Vue 3 via CDN quando há interatividade (ver `readme.md`); evite tooling pesado.
- Views seguem `render(request, 'app/template.html', context)`; mantenha nomes explícitos e caminhos consistentes.
- Static assets em `static/` e coletados para `staticfiles/`; cuide para referenciar via `{% static %}` e rodar `python manage.py collectstatic --noinput` em deploys.
- Cada app segue a convenção Django clássica (`models.py`, `views.py`, `urls.py`, `templates/`, `migrations/`).

## Fluxos de desenvolvimento
- Ambiente local: `python -m venv .venv`, `source .venv/bin/activate`, `pip install -r requirements.txt`, `python manage.py migrate`, `python manage.py runserver`.
- Testes: `python manage.py test` global ou `python manage.py test mapa_fotos` para isolar apps.
- Antes de alterar modelos, rode `python manage.py makemigrations <app>` e revise o diff antes de `migrate`.
- Ajustes em URLs exigem atualizar `setup/urls.py` e validar carregamento manualmente via `runserver` ou requests automatizados.

## Deploy, operações e scripts
- O repo já está preparado para Docker/Gunicorn: `Dockerfile`, `docker-compose.yml` e `deploy.sh` automatizam backup → build → subida do container `resolve_django_app` na rede `npm-network` (ver `DEPLOY_GUIDE.md` e `README_DEPLOYMENT.md`).
- Para deploy manual use `docker build -t resolve-django:latest .` seguido de `docker-compose up -d`; valide com `docker logs -f resolve_django_app` e `curl -I https://resolve.eng.br`.
- Variáveis de ambiente vivem em `.env`; nunca commitá-lo. Deploy script já faz `collectstatic` e migrações durante o boot.
- Usuários Windows podem tunelar para o host via `RESOLVE.bat` e scripts em `WINDOWS_SCRIPTS_README.md`; mantenha credenciais SSH fora do repo.

## Referências úteis
- `DEPLOY_GUIDE.md`, `README_DEPLOYMENT.md`, `QUICK_COMMANDS.md` e `GUIA_ATUALIZACOES.md` documentam passo a passo de deploy, rollback e atualizações.
- `ferramenta_mapa/views.py`, `mapa_fotos/views.py` e `ferramenta_drenagem/views.py` mostram padrões de manipulação de formulários e uploads.
- Logs e mídia: containers montam `static/` e `media/`; problemas recorrentes são permissões (`chown -R 1000:1000 ...`) conforme guias.

## Boas práticas para agentes
- Preserve a separação de templates por app e mantenha nomes coerentes; quebras em paths costumam falhar só em runtime.
- Ao tocar em migration ou dependências registre passos no guia correspondente e atualize `requirements.txt` (Gunicorn já incluído).
- Nunca introduza serviços externos sem ajustar `setup/settings.py` e documentar novos env vars.
- Consulte `archived_apps/` apenas como referência histórica; novas features devem viver nas pastas ativas na raiz do projeto.
