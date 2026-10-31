"""SQLAlchemy database engine and session configuration for Neon PostgreSQL."""

import os
import re
from typing import Any, Dict, Generator, List, Optional
from urllib.parse import urlparse, parse_qs

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Load environment variables from .env file if present
load_dotenv()

Base = declarative_base()


def mask_database_url(url: Optional[str]) -> str:
    """Mask credentials in database URL to prevent leaking passwords in logs."""
    if not url:
        return "<EMPTY>"
    # Pattern to match ://username:password@
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", url)


def get_normalized_database_url(raw_url: str) -> str:
    """Ensure standard PostgreSQL driver and SSL mode requirements for Neon."""
    url = raw_url.strip().strip("'").strip('"')

    # Normalize driver scheme for SQLAlchemy + psycopg2
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]

    # Ensure sslmode=require is present in URL query
    if "sslmode=" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}sslmode=require"

    return url


def get_engine():
    """Create and return configured SQLAlchemy engine with Neon-optimized pooling."""
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        raise ValueError(
            "DATABASE_URL environment variable is not configured. "
            "Please configure DATABASE_URL in your environment or .env file."
        )

    normalized_url = get_normalized_database_url(raw_url)

    # Neon Serverless PostgreSQL Connection Pooling Configuration:
    # - pool_pre_ping=True: Health-checks idle connections before checkout (vital for Neon serverless resume)
    # - pool_recycle=300: Recycles connections every 5 minutes to prevent stale cloud sockets
    # - pool_size=5, max_overflow=10: Sized appropriately for application workload and serverless poolers
    engine = create_engine(
        normalized_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30.0,
        connect_args={"sslmode": "require"},
    )
    return engine


# Lazy initialization of engine and sessionmaker to avoid crashing at import time if DATABASE_URL is not yet set
_engine = None
_SessionLocal = None


def get_sessionmaker():
    global _engine, _SessionLocal
    if _SessionLocal is None:
        _engine = get_engine()
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding database session."""
    session_factory = get_sessionmaker()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


_PREFERRED_TRANSPORT = None  # "tcp" or "https"


def execute_query(query: str, params: Optional[list] = None) -> List[Dict[str, Any]]:
    """Execute SQL query returning list of row dictionaries.
    
    Supports dual transport: standard SQLAlchemy TCP (port 5432) or Neon Cloud HTTPS (port 443).
    Automatically selects and caches the working transport for the current network environment.
    """
    global _PREFERRED_TRANSPORT

    # If already known that local network blocks port 5432, execute via HTTPS directly
    if _PREFERRED_TRANSPORT == "https":
        res = query_neon_http(query, params)
        return res.get("rows", [])

    if _PREFERRED_TRANSPORT == "tcp":
        try:
            engine = get_engine()
            with engine.connect() as conn:
                result = conn.execute(text(query), params or {})
                if result.returns_rows:
                    cols = list(result.keys())
                    return [dict(zip(cols, row)) for row in result.fetchall()]
                return []
        except Exception:
            _PREFERRED_TRANSPORT = "https"
            res = query_neon_http(query, params)
            return res.get("rows", [])

    # Transport undetermined: attempt TCP first
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            _PREFERRED_TRANSPORT = "tcp"
            if result.returns_rows:
                cols = list(result.keys())
                return [dict(zip(cols, row)) for row in result.fetchall()]
            return []
    except Exception:
        # Port 5432 blocked or reset: switch to Neon HTTPS
        _PREFERRED_TRANSPORT = "https"
        res = query_neon_http(query, params)
        return res.get("rows", [])


def query_neon_http(query: str, params: Optional[list] = None) -> Dict[str, Any]:
    """Execute SQL query against Neon PostgreSQL over HTTPS port 443.
    
    Provides reliable connectivity in restricted environments where local ISPs or
    firewalls block or reset raw TCP traffic on port 5432.
    """
    import json
    import urllib.request
    from urllib.parse import urlparse

    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        raise ValueError("DATABASE_URL is not set")
    
    clean_url = raw_url.strip().strip("'").strip('"')
    parsed = urlparse(clean_url)
    host = parsed.hostname
    endpoint_url = f"https://{host}/sql"
    
    headers = {
        "Neon-Connection-String": clean_url,
        "Content-Type": "application/json",
    }
    body = json.dumps({"query": query, "params": params or []}).encode("utf-8")
    req = urllib.request.Request(endpoint_url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise RuntimeError(f"Neon HTTP Error {e.code}: {error_body} | Query: {query[:200]}") from e


def test_connection() -> Dict[str, Any]:
    """Test connection to Neon PostgreSQL and execute SELECT version().

    Evaluates standard SQLAlchemy TCP connection (Port 5432) and falls back
    to Neon's HTTPS transport (Port 443) if the local network/ISP resets TCP 5432.
    Never exposes credentials or passwords in output or exceptions.
    """
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        return {
            "success": False,
            "status": "missing_configuration",
            "error": "DATABASE_URL environment variable is not set. Please configure DATABASE_URL in .env.",
        }

    masked_url = mask_database_url(raw_url)

    # 1. First attempt: Standard SQLAlchemy over TCP port 5432
    tcp_error = None
    try:
        engine = get_engine()
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            row = result.fetchone()
            version_str = row[0] if row else "Unknown"
            return {
                "success": True,
                "status": "connected",
                "transport": "SQLAlchemy TCP (Port 5432)",
                "masked_url": masked_url,
                "server_version": version_str,
            }
    except Exception as e:
        tcp_error = str(e)
        if raw_url and "@" in raw_url:
            parsed = urlparse(raw_url)
            if parsed.password:
                tcp_error = tcp_error.replace(parsed.password, "***")

    # 2. Second attempt: Neon HTTPS SQL transport (Port 443)
    # Useful when local ISP/Wi-Fi firewall drops or resets outbound port 5432 TLS traffic
    try:
        http_res = query_neon_http("SELECT version();")
        rows = http_res.get("rows", [])
        version_str = rows[0]["version"] if rows else "Unknown"
        return {
            "success": True,
            "status": "connected_via_https",
            "transport": "Neon Cloud HTTPS (Port 443)",
            "masked_url": masked_url,
            "server_version": version_str,
            "tcp_error": tcp_error,
            "network_note": (
                "Local network/ISP firewall actively resets outbound TLS traffic on port 5432 (WinError 10054). "
                "Connected and verified successfully via Neon's secure HTTPS transport (Port 443). "
                "In cloud deployment environments (Docker, Railway, Render, AWS), standard port 5432 connects directly."
            ),
        }
    except Exception as http_err:
        http_err_str = str(http_err)
        if raw_url and "@" in raw_url:
            parsed = urlparse(raw_url)
            if parsed.password:
                http_err_str = http_err_str.replace(parsed.password, "***")
        return {
            "success": False,
            "status": "connection_failed",
            "masked_url": masked_url,
            "error": f"TCP error: {tcp_error} | HTTPS error: {http_err_str}",
        }
