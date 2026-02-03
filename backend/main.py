from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging

# Load environment variables
import os
from pathlib import Path

env_path = Path(__file__).parent / ".env"
success = load_dotenv(dotenv_path=env_path)

print(f"DEBUG: .env path: {env_path}")
print(f"DEBUG: .env loaded: {success}")
print(f"DEBUG: OPENAI_API_KEY present: {'OPENAI_API_KEY' in os.environ}")

from api import chat
from api import thesis, decks, council

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create FastAPI app
app = FastAPI(
    title="VentureSight AI API",
    description="Multi-Agent VC Pitch Deck Analysis Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - VentureSight AI
app.include_router(thesis.router)
app.include_router(decks.router)
app.include_router(council.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {
        "message": "VentureSight AI API",
        "version": "1.0.0",
        "description": "Multi-Agent VC Pitch Deck Analysis Platform",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
