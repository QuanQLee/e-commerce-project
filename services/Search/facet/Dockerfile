FROM public.ecr.aws/docker/library/python:3.12-slim AS build
WORKDIR /app
COPY pyproject.toml poetry.lock* ./
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple         --default-timeout=120 poetry &&         poetry config virtualenvs.create false &&         poetry config repositories.aliyun https://mirrors.aliyun.com/pypi/simple &&         poetry lock && poetry install --no-interaction --no-ansi --no-root
COPY app ./app
RUN poetry build -f wheel

FROM public.ecr.aws/docker/library/python:3.12-slim
WORKDIR /app
COPY --from=build /app/dist/*.whl .
RUN pip install --no-cache-dir *.whl && rm *.whl
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
