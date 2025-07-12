FROM python:3.11-slim
WORKDIR /app

# 1. Copy dependency files first
COPY pyproject.toml poetry.lock ./

# 2. Install dependencies but skip this project (--no-root)
RUN pip install --no-cache-dir poetry \
    && poetry config virtualenvs.create false \
    && poetry install --only main --no-root   # key change

# 3. Copy application source
COPY app ./app

# 4. Launch the service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
