"""Application factory for the regression-farm controller."""
from __future__ import annotations

import logging
import os

from flask import Flask

from .config import Config
from .extensions import db, migrate


def create_app(config: Config | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config or Config())

    logging.basicConfig(
        level=app.config["LOG_LEVEL"],
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    os.makedirs(app.config["LOG_DIR"], exist_ok=True)
    os.makedirs(app.config["ARTIFACT_DIR"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)

    from .api import jobs, workers, schedules, analytics, logs as logs_api

    app.register_blueprint(workers.bp)
    app.register_blueprint(jobs.bp)
    app.register_blueprint(logs_api.bp)
    app.register_blueprint(schedules.bp)
    app.register_blueprint(analytics.bp)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    if app.config.get("SCHEDULER_ENABLED", True) and not app.config.get("TESTING"):
        from .services.scheduler import start_scheduler

        start_scheduler(app)

    return app
