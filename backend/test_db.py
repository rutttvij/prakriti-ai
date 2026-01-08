from sqlalchemy import create_engine, text

engine = create_engine(
    "postgresql+psycopg2://prakriti:prakriti@localhost:5432/prakriti_db"
)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("DB Connection OK:", result.scalar())
except Exception as e:
    print("DB ERROR:", e)
