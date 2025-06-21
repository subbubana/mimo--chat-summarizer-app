# SQL database connection & ORM setup
# backend/src/db/sql_client.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.src.db.base import Base

from backend.config.settings import SQL_DATABASE_URL
# SQLAlchemy setup
engine = create_engine(SQL_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

print(f"DEBUG SQL_CLIENT Base ID: {id(Base)}")


# Dependency to get a database session
import backend.src.app.models.user_models
import backend.src.app.models.chat_models
# ------------------------------------------------------------------


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_all_tables():
    print("Attempting to create SQL tables...")
    print(f"DEBUG: Tables registered with Base.metadata: {list(Base.metadata.tables.keys())}")
    Base.metadata.create_all(bind=engine)
    print("All SQL tables created successfully!")

if __name__ == "__main__":
    print(f"DEBUG: Attempting to connect to DB with URL: {SQL_DATABASE_URL}")
    create_all_tables()
    print("Done.")
