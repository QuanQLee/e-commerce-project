FROM python:3.11-slim
WORKDIR /app

COPY pyproject.toml poetry.lock ./

RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
        --default-timeout=120 poetry && \
    poetry config virtualenvs.create false && \
    poetry config repositories.tsinghua https://pypi.tuna.tsinghua.edu.cn/simple && \
    poetry install --only main --no-root -vvv


COPY app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
