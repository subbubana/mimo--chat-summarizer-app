# backend/src/db/base.py
from sqlalchemy.ext.declarative import declarative_base

# Define the Base for our declarative models
Base = declarative_base()

# Optional: Keep this debug print to verify it's only called once
print(f"DEBUG: Base object created in base.py with ID: {id(Base)}")