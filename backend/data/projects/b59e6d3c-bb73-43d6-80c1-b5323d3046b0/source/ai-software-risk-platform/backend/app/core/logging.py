"""
Centralized logging configuration.

Provides a single place to configure application-wide logging so that
every module logs consistently. Sensitive information (passwords,
tokens, secrets, credentials) must never be logged.
"""

import logging
import sys

from app.core.config import settings

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging() -> None:
    """Configure root logging handlers and levels for the application."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT))

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Avoid duplicate handlers if configure_logging() is called more than once
    # (e.g. during tests that re-import the app).
    if not root_logger.handlers:
        root_logger.addHandler(handler)

    # Tame overly-verbose third-party loggers.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger, used consistently across the application."""
    return logging.getLogger(name)
