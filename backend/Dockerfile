FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Attendre que PostgreSQL soit prêt avant de démarrer
CMD ["sh", "-c", "sleep 5 && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"]