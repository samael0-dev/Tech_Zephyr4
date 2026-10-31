"""Unit tests for Neon PostgreSQL database configuration and security."""

import os
from api.database import mask_database_url, get_normalized_database_url, test_connection as run_db_test_connection


def test_mask_database_url():
    raw = "postgresql://myuser:secretpassword123@ep-test.neon.tech/neondb?sslmode=require"
    masked = mask_database_url(raw)
    assert "secretpassword123" not in masked
    assert "myuser:***@" in masked


def test_get_normalized_database_url():
    # Convert postgres:// to postgresql+psycopg2://
    raw1 = "postgres://user:pass@host/db"
    norm1 = get_normalized_database_url(raw1)
    assert norm1.startswith("postgresql+psycopg2://")
    assert "sslmode=require" in norm1

    # Retain postgresql+psycopg2 and ensure sslmode
    raw2 = "postgresql://user:pass@host/db?sslmode=require"
    norm2 = get_normalized_database_url(raw2)
    assert norm2.startswith("postgresql+psycopg2://")
    assert "sslmode=require" in norm2


def test_connection_handling_when_unconfigured(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    res = run_db_test_connection()
    assert res["success"] is False
    assert res["status"] == "missing_configuration"
    assert "DATABASE_URL" in res["error"]
