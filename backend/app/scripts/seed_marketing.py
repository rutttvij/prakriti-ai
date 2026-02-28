from app.core.database import SessionLocal
from app.services.marketing_service import seed_marketing_content


def run() -> None:
    db = SessionLocal()
    try:
        with db.begin():
            seed_marketing_content(db)
    finally:
        db.close()


if __name__ == "__main__":
    run()
