FROM python:3.12-slim

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências essenciais do sistema e compilação
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro para tirar partido de dependências cacheadas
COPY requirements.txt .

# Instalar as dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o restante código do serviço
COPY . .

# Definir porta 
ENV PORT=8001
EXPOSE $PORT

# Inicia o servico via main.py para respeitar a variavel $PORT do Railway
CMD ["python", "main.py"]
