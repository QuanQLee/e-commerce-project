FROM python:3.11-slim
WORKDIR /app

# ① 先只复制依赖清单
COPY pyproject.toml poetry.lock ./

# ② 安装依赖，但 **不装当前项目**（加 --no-root）
RUN pip install --no-cache-dir poetry \
    && poetry config virtualenvs.create false \
    && poetry install --only main --no-root   # ← 关键改动

# ③ 再把源码复制进来
COPY app ./app

# ④ 启动命令按你的实际入口写
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
