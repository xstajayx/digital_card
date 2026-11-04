# syntax=docker/dockerfile:1
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements-runtime.lock.txt /app/requirements.txt
# Optional managed-environment CA is mounted only for this build step.
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then PIP_CERT=/run/secrets/proxy_ca pip install --no-cache-dir -r requirements.txt; \
    else pip install --no-cache-dir -r requirements.txt; fi
COPY --chown=10001:10001 backend/__init__.py /app/backend/__init__.py
COPY --chown=10001:10001 backend/silent_hello /app/backend/silent_hello
COPY --chown=10001:10001 backend/migrations /app/backend/migrations
USER 10001:10001
CMD ["sh", "-c", "exec uvicorn backend.silent_hello.asgi:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --limit-concurrency 16 --timeout-keep-alive 5 --no-access-log --no-proxy-headers"]
