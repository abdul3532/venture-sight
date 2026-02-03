"""
VentureSight AI - Pydantic Models
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


# Chat Models
class ChatMessage(BaseModel):
    """Single chat message"""
    id: Optional[str] = None
    conversation_id: Optional[str] = None
    role: str  # "user" | "assistant"
    content: str
    created_at: Optional[str] = None


class ChatRequest(BaseModel):
    """Request for AI Associate chat"""
    query: str
    conversation_id: Optional[str] = None
    deck_id: Optional[str] = None  # Context from a specific deck
    deck_ids: Optional[List[str]] = None  # Context from multiple decks
    document_context: Optional[str] = None  # Raw text for context


# Competitor Models
class Competitor(BaseModel):
    """Competitor information from web search"""
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    funding: Optional[str] = None
    location: Optional[str] = None


class CompetitorAnalysis(BaseModel):
    """Competitor analysis results"""
    startup_name: str
    industry: str
    competitors: List[Competitor] = []
