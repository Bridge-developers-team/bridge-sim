# One image: Node builds the front end, Python serves the API and the build.
# Render builds this on every deploy; CI builds and smoke-tests it on every PR.

# --- 1. Front end -----------------------------------------------------------
FROM node:24-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- 2. API + static files --------------------------------------------------
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.12.3 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1 PATH="/app/.venv/bin:$PATH" STATIC_DIR=/app/static \
    DATABASE_URL=sqlite+aiosqlite:////tmp/bridge.db
WORKDIR /app

# Dependencies first, so a code-only change reuses this layer.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/src ./src
RUN uv sync --frozen --no-dev
COPY --from=frontend /frontend/dist /app/static

RUN useradd --create-home --uid 10001 bridge
USER bridge

# Without DATABASE_URL (local docker run, CI smoke test) proofs go to SQLite in
# /tmp and vanish with the container; production sets a Neon URL.
# Render sets PORT. --proxy-headers makes the client IP the visitor's, not
# Render's proxy (the per-client AI limit depends on it).
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn bridge.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
