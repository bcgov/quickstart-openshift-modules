import os
import logging
from urllib.parse import quote
from typing import Optional, Union, Any
from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "127.0.0.1")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = quote(os.getenv("POSTGRES_PASSWORD", "postgres"), safe='')
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres")
    SQLALCHEMY_DATABASE_URI: Union[Optional[PostgresDsn], Optional[str]] = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], values: Any) -> Any:
        if isinstance(v, str):
            return v
        dsn = PostgresDsn.build(
            scheme="postgresql+psycopg2",
            username=values.data.get("POSTGRES_USER"),
            password=quote(values.data.get("POSTGRES_PASSWORD"), safe=''),
            host=quote(values.data.get("POSTGRES_HOST"), safe=''),
            port=int(values.data.get("POSTGRES_PORT")),
            path=f"{values.data.get('POSTGRES_DB') or ''}",
        )
        logging.debug("Constructed SQLALCHEMY_DATABASE_URI: %s", dsn)
        return dsn

Configuration = Settings()