### Passo 1: Criar o Ambiente Virtual (Isolamento)

No Python, nunca instalamos bibliotecas globalmente no Windows para evitar conflitos. Criamos uma `.venv` (Virtual Environment).

1.  Abra o VS Code na pasta `DJANGO`.
2.  Abra o terminal (Ctrl + ' ou Ver \> Terminal).
3.  Certifique-se de que o terminal está rodando **PowerShell** ou **Command Prompt**.
4.  Execute os comandos abaixo:

<!-- end list -->

```powershell
# 1. Cria o ambiente virtual na pasta .venv
python -m venv .venv

# 2. Ativa o ambiente virtual (Windows)
# Se der erro de permissão, avise. Geralmente funciona direto.
.\.venv\Scripts\Activate
```

*Você saberá que funcionou se aparecer um `(.venv)` verde ou branco antes do caminho da pasta no terminal.*

-----

### Passo 2: Instalar o Django

Com a venv ativa:

```powershell
# 1. Atualiza o gerenciador de pacotes (boa prática)
python.exe -m pip install --upgrade pip

# 2. Instala o Django
pip install django
```

-----

### Passo 3: Criar a Estrutura do Projeto

Aqui está o "pulo do gato" para não ficar com pastas aninhadas desnecessárias (tipo `projeto/projeto/settings.py`).

Vamos chamar a pasta de configurações de `setup`. Isso deixa claro que ali ficam as configurações globais, e não um aplicativo de engenharia.

Execute exatamente este comando (note o **ponto** no final):

```powershell
# O "." diz para instalar na pasta atual, sem criar subpasta extra
django-admin startproject setup .
```

Neste momento, sua estrutura de arquivos deve estar assim:

```text
DJANGO/
├── .git/
├── .venv/
├── setup/          <-- Configurações Globais (settings, urls)
├── manage.py       <-- O gerente do projeto
```

-----

### Passo 4: Configurar o `.gitignore` (Crucial)

Como você já sincroniza com o GitHub, precisamos garantir que arquivos pesados ou senhas não subam.

Crie um arquivo chamado `.gitignore` na raiz (ao lado do `manage.py`) e cole o conteúdo abaixo.

O código está pronto para copiar e colar:

```text
# .gitignore padrão para projetos Django com VS Code e Windows

# Python e Venv
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
env/

# Django
*.log
local_settings.py
db.sqlite3
media/

# VS Code e IDEs
.vscode/
.idea/

# Variáveis de ambiente (Segurança)
.env

# Windows
Thumbs.db
```

-----

### Passo 5: Primeira Execução e Migração

O Django precisa criar o banco de dados inicial (SQLite por enquanto) para gerenciar os usuários.

```powershell
# 1. Cria as tabelas iniciais do sistema (auth, admin, sessions)
python manage.py migrate

# 2. Cria o seu superusuário (para acessar o admin depois)
# Siga as instruções na tela (Email opcional, senha não aparece digitando)
python manage.py createsuperuser

# 3. Roda o servidor de desenvolvimento
python manage.py runserver
```

Agora, abra o navegador e acesse: `http://127.0.0.1:8000`.
Se ver um foguete 🚀 escrito "The install worked successfully\!", está tudo pronto.

-----

### Passo 6: Congelar as Dependências

Para garantir que o servidor Linux tenha as mesmas versões que seu Windows:

```powershell
# Para o servidor (Ctrl+C) se estiver rodando e execute:
pip freeze > requirements.txt
```

Agora você pode fazer o **Commit** e **Push** para o GitHub. A pasta `.venv` será ignorada, e o resto subirá corretamente.




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
O que eu quero agora:
Objetivo: [Descreva aqui — ex.: "Criar app calculo_vigas com API JSON e página Vue para cálculo de vigas" ou "Corrigir cálculo no app ferramenta_drenagem"]
Critérios de aceite / testes esperados: [ex.: "Página deve calcular momento fletor e retornar JSON com detalhes; testes unitários devem passar."]
Restrições: usar Vue via CDN (sem build tool), Bootstrap 5, manter compatibilidade com Python 3.11 e Django 5.2.
Prioridade / prazo: [opcional]
Para bugs, inclua também:
Passos exatos para reproduzir
Saída esperada vs saída atual
Traceback/erros completos
Branch/commit onde o erro aparece
Para features, inclua:
Especificação mínima (campos, endpoints, inputs/outputs, comportamento esperado)
Exemplos de payloads (JSON) e respostas
Regras de negócio ou fórmulas (se aplicável)
Permissões e operação:
Autorizo que o assistente gere patches para aplicar localmente. [Marque se também quer commits/push automáticos; se sim, forneça autorização e indique a branch alvo.]
Se precisar, gere também:

Um branch com a implementação (ex.: feature/calculo_vigas) e eu posso commitar/pushar (preciso autorizar explicitamente).
Um conjunto de testes unitários mínimos (tests.py) para validar fórmulas.
Checklist rápido que costumo colar junto com o prompt:

URL do repo / permissão de leitura (se necessário)
Comandos para instalar/rodar (dependências / venv)
Versões (Python/Django/DB)
Branch alvo
Objetivo claro + critérios de aceite
Tracebacks (para bugs)
Indicação se o assistente pode commitar/push