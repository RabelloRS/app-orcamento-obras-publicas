# Resolve - Scripts para Windows

Este diretório contém scripts `.bat` para facilitar o acesso ao servidor Django remoto do seu computador Windows.

## 📋 Arquivos

### 1. **RESOLVE.bat** (RECOMENDADO) ⭐
- **Uso**: Mais simples e direto
- **Status**: Pré-configurado com dados reais
- **O que faz**:
  - Conecta via SSH ao servidor remoto
  - Inicia automaticamente o servidor Django na porta 8081
  - Abre o navegador na URL `http://localhost:8081`
  - Mantém a janela SSH aberta para monitoramento

### 2. **run_resolve_server_advanced.bat**
- **Uso**: Versão com mais recursos
- **Status**: Requer configuração manual
- **Features extras**:
  - Validação de SSH instalado
  - Teste de conexão antes de abrir navegador
  - Mensagens mais detalhadas
  - Melhor tratamento de erros

### 3. **run_resolve_server.bat**
- **Uso**: Versão simplificada
- **Status**: Requer configuração manual
- **Ideal para**: Usuários que já conhecem os scripts

## 🚀 Como Usar

### Pré-requisitos:
1. **Git para Windows** instalado (vem com SSH)
   - Download: https://git-scm.com/download/win
   - Ou Windows 10+ com OpenSSH instalado

2. **Chave SSH configurada** no Windows
   - Pasta: `C:\Users\seu_usuario\.ssh\`
   - Arquivo: `id_rsa` (chave privada)

### Passos:

#### Opção 1: Usar RESOLVE.bat (MAIS FÁCIL)
1. Copie `RESOLVE.bat` para sua **Área de Trabalho**
2. **Clique duas vezes** para executar
3. A janela SSH abrirá automaticamente
4. O navegador abrirá em `http://localhost:8081`
5. Para parar: feche a janela SSH

#### Opção 2: Usar versão customizável
1. Abra `run_resolve_server_advanced.bat` com Bloco de Notas
2. Edite as configurações no topo:
   ```batch
   set SSH_USER=seu_usuario
   set SSH_HOST=seu_servidor.com
   set SSH_PORT=22
   set REMOTE_APP_PORT=8081
   ```
3. Salve e execute

## 🔧 Solução de Problemas

### "SSH não encontrado"
- **Solução**: Instale Git para Windows
  - https://git-scm.com/download/win
  - Durante instalação, mantenha a opção padrão de adicionar ao PATH

### "Conexão recusada"
- **Possíveis causas**:
  - Servidor remoto desligado
  - Chave SSH não configurada
  - Firewall bloqueando porta SSH (22)
- **Solução**: Teste a conexão manualmente:
  ```cmd
  ssh -p 22 root@srv557898.hstgr.cloud
  ```

### "Servidor não responde"
- Aguarde 10 segundos (Django leva tempo para iniciar)
- Tente abrir `http://localhost:8081` no navegador manualmente

## 📝 Informações do Servidor

```
Host: srv557898.hstgr.cloud
Usuário: root
Porta SSH: 22
Aplicação: Django (porta 8081)
Caminho: /var/www/resolve_django
```

## 🛡️ Segurança

- ✅ Usa autenticação por chave SSH (não requer senha)
- ✅ Chave privada permanece no seu PC
- ✅ Conexão criptografada
- ✅ Sem armazenamento de senhas nos scripts

## ❓ FAQ

**P: Preciso de senhas?**
R: Não! Usa autenticação por chave SSH já configurada no Windows.

**P: Posso fechar a janela SSH?**
R: Sim, mas o servidor parará também. Isto é intencional para segurança.

**P: Funciona com Windows 7/8?**
R: Sim, desde que instale Git para Windows.

**P: Posso deixar o servidor rodando 24/7?**
R: Para isso, use uma solução de produção (Systemd, Supervisor, etc.) no servidor, não os scripts .bat.

## 📞 Suporte

Para problemas ou dúvidas, consulte a documentação do projeto em `/var/www/resolve_django/README.md`

---

**Desenvolvido por**: Rodrigo Emanuel Rabello - Engenheiro Civil
**Localização**: Nova Petrópolis, RS - Brasil
