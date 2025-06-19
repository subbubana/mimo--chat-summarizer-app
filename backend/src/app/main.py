# Backend main application and API routes
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "Chat Summarizer Backend is running!"}
