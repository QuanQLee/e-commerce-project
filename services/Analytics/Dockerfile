# ── 1 选择与 pyproject.toml 一致的 Python 版本 ───────────────────────────────
FROM python:3.12-slim

# ── 2 安装 Poetry ────────────────────────────────────────────────────────────
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir poetry

# ── 3 先装第三方依赖，不装根包（--no-root）──────────────────────────────────
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false \
 && poetry install --no-interaction --no-ansi --no-root   # ← 只装依赖

# ── 4 再拷源码，并把根包装进去 ───────────────────────────────────────────────
COPY ./app ./app
RUN poetry install --no-interaction --no-ansi              # ← 这次装根包

# ── 5 运行服务 ───────────────────────────────────────────────────────────────
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
