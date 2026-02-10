from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # MySQL Configuration
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "deptsync"
    MYSQL_DATABASE: str = "deptsync"

    # JWT Configuration
    SECRET_KEY: str = "deptsync-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # OpenAI Configuration
    OPENAI_API_BASE: Optional[str] = None
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # MinIO Configuration
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "deptsync"
    MINIO_SECURE: bool = False

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
