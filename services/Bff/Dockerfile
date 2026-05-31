FROM public.ecr.aws/docker/library/python:3.12-slim AS build
WORKDIR /app
COPY pyproject.toml poetry.lock* ./
RUN pip install --no-cache-dir poetry && \
    poetry config virtualenvs.create false && \
    poetry lock && poetry install --no-interaction --no-ansi --no-root
COPY app ./app
RUN poetry build -f wheel

FROM public.ecr.aws/docker/library/python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BFF_WORKERS=2
WORKDIR /app
RUN addgroup --system --gid 10001 appgroup && \
    adduser --system --uid 10001 --ingroup appgroup appuser
COPY --from=build /app/dist/*.whl ./
COPY --from=build /app/app ./app
RUN pip install --no-cache-dir "setuptools<81" *.whl && rm *.whl && \
    chown -R appuser:appgroup /app
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)"
EXPOSE 8000
USER appuser
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${BFF_WORKERS:-2} --proxy-headers --forwarded-allow-ips '*'"]
