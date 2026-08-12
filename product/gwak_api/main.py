from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from gwak_api import __version__
from gwak_api.core.audit import AuditLog  # noqa: F401
from gwak_api.core.config import get_settings
from gwak_api.core.db import Base, engine, init_schemas
from gwak_api.core.errors import ApiError, api_error_handler
from gwak_api.events import register_consumers
from gwak_api.modules.auth import models as auth_models  # noqa: F401
from gwak_api.modules.auth.router import router as auth_router
from gwak_api.modules.clinical import models as clinical_models  # noqa: F401
from gwak_api.modules.clinical.router import router as clinical_router
from gwak_api.modules.commerce.router import router as commerce_router
from gwak_api.modules.pharmacy import models as pharmacy_models  # noqa: F401
from gwak_api.modules.records import models as records_models  # noqa: F401
from gwak_api.modules.records.router import (
    admin_router,
    labs_router,
    notify_router,
    records_router,
)
from gwak_api.modules.admin.ops_router import router as admin_ops_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_schemas()
    Base.metadata.create_all(bind=engine)
    register_consumers()
    yield


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(ApiError, api_error_handler)

prefix = settings.api_prefix
app.include_router(auth_router, prefix=prefix)
app.include_router(clinical_router, prefix=prefix)
app.include_router(commerce_router, prefix=prefix)
app.include_router(records_router, prefix=prefix)
app.include_router(notify_router, prefix=prefix)
app.include_router(labs_router, prefix=prefix)
app.include_router(admin_router, prefix=prefix)
app.include_router(admin_ops_router, prefix=prefix)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "gwak_api",
        "version": __version__,
        "licence": {
            "form_20": settings.pharmacy_licence_form_20,
            "form_21": settings.pharmacy_licence_form_21,
            "helpline": settings.support_helpline,
        },
    }


def run() -> None:
    import uvicorn

    uvicorn.run(
        "gwak_api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
    )


if __name__ == "__main__":
    run()
