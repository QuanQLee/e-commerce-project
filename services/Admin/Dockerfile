FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml poetry.lock* ./
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple \
        --default-timeout=120 poetry && \
    poetry config virtualenvs.create false && \
    poetry config repositories.aliyun https://mirrors.aliyun.com/pypi/simple && \
    poetry install --no-interaction --no-ansi
COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
