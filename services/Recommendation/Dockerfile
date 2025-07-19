FROM python:3.12-slim
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple \
        --default-timeout=120 poetry
WORKDIR /app
COPY pyproject.toml ./
RUN poetry config virtualenvs.create false && \
    poetry config repositories.aliyun https://mirrors.aliyun.com/pypi/simple && \
    poetry install --no-interaction --no-ansi --no-root
COPY ./app ./app
RUN poetry install --no-interaction --no-ansi
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
