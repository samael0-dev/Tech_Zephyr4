from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ai.rag.retrieval_service import initialize_default_knowledge_base
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import SessionLocal
from app.services.data_loader import init_db, load_starter_pack_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed starter data
    init_db()
    db = SessionLocal()
    try:
        load_starter_pack_data(db)
        initialize_default_knowledge_base(db)
    finally:
        db.close()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent Campus Operations Platform for Chilika Institute of Technology (CIT)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Standardized Exception Handlers for uniform error envelope
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        500: "INTERNAL_SERVER_ERROR",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code_map.get(exc.status_code, "ERROR"),
                "message": exc.detail,
                "details": [],
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request payload failed schema validation",
                "details": exc.errors(),
            },
        },
    )


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "1.0.0",
    }


# Include V1 API
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
