<!-- Copilot / AI agent instructions for this Django project -->
# Copilot instructions — Projeto Django (Resolve)

Objetivo curto
- Ajude desenvolvedores a entender rapidamente a arquitetura, padrões e comandos essenciais deste projeto Django para serem produtivos sem contexto adicional.

Arquitetura geral (big picture)
- Projeto Django monolítico com apps por funcionalidade em top-level: `ferramenta_drenagem`, `ferramenta_mapa`, `mapa_fotos`, `usuarios`.
- Configurações do projeto estão em `setup/settings.py`; roteamento central em `setup/urls.py`; entrypoint `manage.py`.
- Persistência: banco SQLite local `db.sqlite3` (pequeno, local). Uploads e arquivos de mídia em `media/` (ex: `media/photos`).

Padrões de código e convenções do projeto
- Cada app segue o padrão Django clássico: `models.py`, `views.py`, `urls.py`, `admin.py`, `templates/`, `migrations/`.
- Templates por app: `templates/<app_template_folder>/...` ou `templates/<app_name>/...`. Exemplos:
  - `ferramenta_drenagem/templates/drenagem/calculo_volume.html`
  - `ferramenta_mapa/templates/mapa/mapa_fotos.html`
  - `mapa_fotos/templates/mapa_fotos/upload.html`
- Arquivos estáticos estão em `static/` (CSS em `static/css`, JS em `static/js`, imagens em `static/img`). `templates/base.html` é o layout base.
- URLs das aplicações geralmente são incluídas no roteamento global (`setup/urls.py`) através de `include()`.

Fluxos de desenvolvedor (comandos úteis)
- Ativar virtualenv (exemplo usado neste ambiente):
```
source .venv/bin/activate
```
- Instalar dependências:
```
pip install -r requirements.txt
```
- Rodar migrações / criar superuser / iniciar servidor de desenvolvimento:
```
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
- Rodar testes:
```
python manage.py test
```
- Coletar estáticos (deploy):
```
python manage.py collectstatic --noinput
```

Pontos de integração e arquivos-chave a inspecionar
- Configurações e middlewares: `setup/settings.py` — ver variáveis relativas a `MEDIA_ROOT`, `STATIC_ROOT`, `ALLOWED_HOSTS`.
- Roteamento principal: `setup/urls.py` — ver como os apps são incluídos.
- Uploads / armazenamento: `media/` e referências em `models.py` dos apps (procure `ImageField`/`FileField`).
- Exemplos de handlers / views: abrir `ferramenta_mapa/views.py`, `mapa_fotos/views.py`, `ferramenta_drenagem/views.py` para ver os padrões de render/redirect.

Práticas observadas neste repositório
- Templates são renderizados com nomes explícitos (ex: `render(request, 'mapa/mapa_fotos.html', {...})`).
- Organização por app: cada app possui suas próprias templates e eventualmente URLs locais (não centralizados em um pacote de templates global).
- Pequeno DB local (sqlite) — alterações de schema normalmente via `makemigrations` + `migrate`.

Recomendações específicas para agentes IA
- Ao editar templates, preserve a estrutura de diretórios em `templates/` e verifique referências relativas no código.
- Ao alterar URLs, atualize `setup/urls.py` e valide carregamento das views manualmente com `runserver`.
- Antes de fazer migrations: execute `python manage.py makemigrations <app>` e revise o diff.
- Testes: use `python manage.py test <app>` para isolar falhas por app.

Exemplos rápidos (buscas úteis)
- Encontrar onde uma view é usada: procurar por `render(request, 'mapa/` ou `include('mapa_fotos.urls')`.
- Localizar templates: `ferramenta_mapa/templates/`, `mapa_fotos/templates/`, `ferramenta_drenagem/templates/`.

Notas finais
- Evite supor serviços externos (não há configurações claras de DB remoto, cache ou broker). Se precisar integrar, atualize `setup/settings.py` e documente a variável de ambiente.
- Se algo não estiver claro, pedir ao mantenedor por detalhes sobre deploy/CI. Pergunte sempre onde as credenciais sensíveis (se houver) deveriam ser armazenadas — não as adicione ao repo.

Se quiseres, posso expandir isto com exemplos de commits, regras de revisão ou trechos de código mais detalhados.
