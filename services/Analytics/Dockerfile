# 1. Use a Python version matching pyproject.toml
FROM python:3.12-slim

# 2. Install Poetry from a Chinese mirror
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple \
        --default-timeout=120 poetry

# 3. Install third-party dependencies first (no root package)
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false \
 && poetry config repositories.tuna https://pypi.tuna.tsinghua.edu.cn/simple \
 && poetry install --no-interaction --no-ansi --no-root


# 4. Copy source code and install root package
COPY ./app ./app
RUN poetry install --no-interaction --no-ansi              # install root package

# 5. Run the service
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
