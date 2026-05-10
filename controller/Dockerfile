FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove gcc libpq-dev

COPY app/ ./app/
COPY migrations/ ./migrations/
COPY wsgi.py entrypoint.sh ./
RUN chmod +x entrypoint.sh

RUN mkdir -p /var/lib/regression-farm/logs /var/lib/regression-farm/artifacts

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
