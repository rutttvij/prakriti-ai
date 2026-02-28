from pydantic import BaseModel
import os

class Settings(BaseModel):
    PROJECT_NAME: str = "Prakriti.AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "CHANGE_ME_SUPER_SECRET"))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "prakriti")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "prakriti")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "prakriti_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")

    DATABASE_URL: str | None = os.getenv("DATABASE_URL")

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def BACKEND_CORS_ORIGINS(self) -> list[str]:
        raw = os.getenv("CORS_ORIGINS")
        if raw:
            return [x.strip() for x in raw.split(",") if x.strip()]
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    # NEW → folder where all uploads (waste photos, ML inputs) are stored
    MEDIA_ROOT: str = "uploads"


settings = Settings()
