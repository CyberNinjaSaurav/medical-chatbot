"""Alembic-compatible schema bootstrap.

For MVP, `Base.metadata.create_all` runs on startup.
When splitting services, generate per-schema Alembic migrations from these models.
"""

REVISION = "0001_initial"
DOWN_REVISION = None
