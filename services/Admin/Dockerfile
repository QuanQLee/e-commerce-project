FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml poetry.lock* ./
RUN pip install poetry && poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi
COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
