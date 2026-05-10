FROM python:3.12-slim
RUN pip install --no-cache-dir pytest==8.3.3
WORKDIR /app
COPY tests/ ./tests/
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
CMD ["pytest", "-v", "tests/", "--junitxml=/artifacts/junit.xml"]
