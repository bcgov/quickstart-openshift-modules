# Use Python 3.14.1 base image and install uv
FROM python:3.14.8-slim-bookworm AS build

# Install uv
RUN pip install --no-cache-dir uv

# Set environment variables for UV
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-install-project --no-dev

# Copy source code
COPY src ./src

# Install the project
RUN uv sync --frozen --no-dev

# Production stage
FROM python:3.14.8-slim-bookworm AS deploy

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PORT=3000 \
    LOG_LEVEL=INFO \
    ENVIRONMENT=production

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy virtual environment and application
COPY --from=build /app/.venv /app/.venv
COPY --from=build /app/src ./src
COPY start-server.sh ./

# Make the script executable
RUN chmod +x start-server.sh

# Health check
HEALTHCHECK --interval=300s --timeout=10s CMD timeout 10s sh -c 'true > http://localhost:${PORT} || exit 1'

# Run as non-privileged user
USER 1001
SHELL ["/bin/bash", "-c"]
CMD ["./start-server.sh"]
