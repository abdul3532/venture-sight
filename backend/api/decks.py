"""
Decks API - Endpoints for pitch deck management.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from dependencies import get_current_user
from services.pdf_service import pdf_service

router = APIRouter(prefix="/api/decks", tags=["decks"])


class DeckSummary(BaseModel):
    """Summary model for deck listings."""
    id: str
    filename: str
    startup_name: Optional[str]
    match_score: Optional[float] = None
    status: str
    uploaded_at: str
    country: Optional[str] = None
    industry: Optional[str] = None
    model: Optional[str] = None
    series: Optional[str] = None
    email: Optional[str] = None
    tam: Optional[float] = None
    tagline: Optional[str] = None
    team_size: Optional[int] = None


class DeckDetail(BaseModel):
    """Full deck details."""
    id: str
    filename: str
    startup_name: Optional[str]
    raw_text: str
    match_score: Optional[float] = None
    status: str
    uploaded_at: str
    notes: Optional[str] = None
    team_size: Optional[int] = None


class SaveNotesRequest(BaseModel):
    notes: str


@router.patch("/{deck_id}/notes")
async def save_notes(
    deck_id: str,
    request: SaveNotesRequest,
    user_id: str = Depends(get_current_user)
):
    """Save user notes for a deck."""
    # Assuming pdf_service has save_notes, if not we add a placeholder or rely on direct DB usually
    # But for now let's assume it exists or use direct DB if needed.
    # Wait, I rewrote pdf_service and didn't include save_notes!
    # I should add it back or just do it here. 
    # Let's check if the previous file had it. Yes.
    # I missed copying it. I will implement it here directly or add to pdf_service.
    # Direct DB is cleaner for simple things.
    from db.client import supabase
    if not supabase: raise HTTPException(500, "DB Error")
    
    supabase.table("pitch_decks").update({"notes": request.notes}).eq("id", deck_id).eq("user_id", user_id).execute()
    return {"message": "Notes saved"}


@router.get("", response_model=List[DeckSummary])
async def list_decks(
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """List all pitch decks, optionally filtered by status."""
    decks = await pdf_service.list_decks(user_id, status)
    return decks


@router.get("/{deck_id}", response_model=DeckDetail)
async def get_deck(
    deck_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get detailed information about a specific deck."""
    deck = await pdf_service.get_deck(deck_id, user_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.post("/upload", response_model=DeckSummary)
async def upload_deck(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """
    Upload a pitch deck PDF for analysis.
    The PDF will be processed in the background.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Read file content
    content = await file.read()
    
    if len(content) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")
    
    # 1. Fast Save
    deck = await pdf_service.save_upload(
        user_id=user_id,
        filename=file.filename,
        file_bytes=content
    )
    
    if not deck:
        raise HTTPException(status_code=500, detail="Failed to initiate upload")
    
    # 2. Queue Background Processing
    background_tasks.add_task(
        pdf_service.process_deck_background,
        deck["id"],
        content,
        user_id
    )
    
    return deck


@router.patch("/{deck_id}/archive")
async def archive_deck(
    deck_id: str,
    user_id: str = Depends(get_current_user)
):
    """Archive a deck (soft delete)."""
    success = await pdf_service.update_deck_status(deck_id, "archived")
    if not success:
        raise HTTPException(status_code=500, detail="Failed to archive deck")
    return {"message": "Deck archived"}


@router.delete("/{deck_id}")
async def delete_deck(
    deck_id: str,
    user_id: str = Depends(get_current_user)
):
    """Permanently delete a deck and its data."""
    success = await pdf_service.delete_deck(deck_id, user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete deck")
    return {"message": "Deck deleted"}
