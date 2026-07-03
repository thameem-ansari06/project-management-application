import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load configuration from .env file securely
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# Format: postgresql://username:password@localhost/database_name
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://postgres:thameem123@localhost/project_db"
)

# THIS is the engine variable that main.py is looking for!
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()