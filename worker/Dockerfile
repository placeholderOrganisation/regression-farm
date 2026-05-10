FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY worker/ ./worker/

# DOCKER_GID is supplied by docker-compose.worker.yml so the in-container
# user can read the bind-mounted /var/run/docker.sock without being root.
ARG DOCKER_GID=999
RUN groupadd -g ${DOCKER_GID} dockerhost \
    && useradd -m -s /bin/bash -G dockerhost appuser \
    && mkdir -p /var/lib/regression-farm-worker /tmp/rf-artifacts \
    && chown -R appuser:appuser /var/lib/regression-farm-worker /tmp/rf-artifacts

USER appuser

CMD ["python", "-m", "worker.main"]
