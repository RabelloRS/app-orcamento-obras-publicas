# Use a imagem base Python oficial
FROM python:3.11-slim

# Definir o diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Criar usuário não-root para segurança
RUN useradd -m -u 1000 django && \
    chown -R django:django /app

# Criar diretorios necessários com permissões corretas
RUN mkdir -p /app/staticfiles /app/media && \
    chmod -R 755 /app/staticfiles /app/media

# Rodar como root (Docker já fornece isolamento)
USER root

# Expor porta
EXPOSE 8000

# Comando para rodar Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "setup.wsgi:application"]
