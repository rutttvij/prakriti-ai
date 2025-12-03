from pydantic import BaseModel
import os

class Settings(BaseModel):
    PROJECT_NAME: str = "Prakriti.AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME_SUPER_SECRET")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "prakriti")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "prakriti")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "prakriti_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # NEW → folder where all uploads (waste photos, ML inputs) are stored
    MEDIA_ROOT: str = "uploads"


settings = Settings()
