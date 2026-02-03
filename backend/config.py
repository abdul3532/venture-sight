
import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    LANGFUSE_PUBLIC_KEY: str = os.getenv("LANGFUSE_PUBLIC_KEY", "")
    LANGFUSE_SECRET_KEY: str = os.getenv("LANGFUSE_SECRET_KEY", "")
    LANGFUSE_HOST: str = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

    # LLM Models
    DEFAULT_MODEL: str = "gpt-4o"
    FAST_MODEL: str = "gpt-4o-mini"
    
    # LLM Settings
    DEFAULT_TEMPERATURE: float = 0.3
    CREATIVE_TEMPERATURE: float = 0.7
    FACTUAL_TEMPERATURE: float = 0.1
    
    # Application Limits
    UI_TRUNCATION_LIMIT: int = 8000
    RAG_CHUNK_LIMIT: int = 5
    MAX_TOOL_LOOPS: int = 5

    # Storage & File Constraints
    ALLOWED_EXTENSIONS: List[str] = ["pdf"]
    MAX_UPLOAD_SIZE_MB: int = 10

settings = Settings()
