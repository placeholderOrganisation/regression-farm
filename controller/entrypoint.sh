#!/usr/bin/env sh
set -e

echo "[entrypoint] waiting for postgres..."
for i in $(seq 1 60); do
    if python -c "
import os, sys
import psycopg2
try:
    psycopg2.connect(
        dbname=os.environ.get('POSTGRES_DB', 'regression_farm'),
        user=os.environ.get('POSTGRES_USER', 'postgres'),
        password=os.environ.get('POSTGRES_PASSWORD', 'postgres'),
        host=os.environ.get('POSTGRES_HOST', 'postgres'),
        port=os.environ.get('POSTGRES_PORT', '5432'),
        connect_timeout=2,
    ).close()
except Exception as e:
    sys.exit(1)
" 2>/dev/null; then
        echo "[entrypoint] postgres reachable"
        break
    fi
    echo "[entrypoint] postgres not ready (attempt $i/60), sleeping 2s"
    sleep 2
done

echo "[entrypoint] running migrations"
cd /app
FLASK_APP=wsgi.py flask db upgrade

echo "[entrypoint] launching gunicorn"
exec gunicorn \
    --workers 1 \
    --threads 8 \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile - \
    wsgi:app
