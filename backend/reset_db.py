from database import engine
import models
from sqlalchemy import text

print("Dropping all tables with CASCADE...")
try:
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
            conn.execute(text("CREATE SCHEMA public;"))
    print("All tables dropped successfully.")
except Exception as e:
    print(f"Error dropping tables: {e}")

print("Creating all tables...")
try:
    models.Base.metadata.create_all(bind=engine)
    print("All tables created successfully!")
except Exception as e:
    print(f"Error creating tables: {e}")

print("Database reset completed.")
