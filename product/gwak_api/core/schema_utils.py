from gwak_api.core.config import get_settings

settings = get_settings()


def table_args(schema: str) -> dict:
    if settings.database_url.startswith("sqlite"):
        return {}
    return {"schema": schema}
