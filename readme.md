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