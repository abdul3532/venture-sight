"""
Council API - Endpoints for triggering and retrieving AI Council analysis.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dependencies import get_current_user
from services.council_service import council_service
from services.pdf_service import pdf_service
from services.thesis_service import thesis_service

router = APIRouter(prefix="/api/council", tags=["council"])


class AnalysisResponse(BaseModel):
    """Response model for council analysis."""
    deck_id: str
    status: str
    optimist: Optional[Any] = None # Can be Dict (legacy) or String (Markdown)
    skeptic: Optional[Any] = None
    quant: Optional[Any] = None
    consensus: Optional[Dict[str, Any]] = None
    # Allow arbitrary dict for consensus to cover crm_data, category_scores etc.
    # checking strictness, Pydantic defaults to ignoring extras if not defined, 
    # but here we defined consensus as Dict[str, Any] so it should be fine IF we pass the whole dict.



class AnalysisTriggerResponse(BaseModel):
    """Response when analysis is triggered."""
    deck_id: str
    message: str
    status: str


async def run_analysis_background(deck_id: str, deck_text: str, thesis: dict):
    """Background task to run council analysis."""
    await council_service.analyze_deck(deck_id, deck_text, thesis)


@router.post("/analyze/{deck_id}", response_model=AnalysisTriggerResponse)
async def trigger_analysis(
    deck_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user)
):
    """
    Trigger AI Council analysis for a pitch deck.
    Analysis runs in the background - poll the GET endpoint for results.
    """
    # Get the deck
    deck = await pdf_service.get_deck(deck_id, user_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    if deck.get("status") == "analyzing":
        return AnalysisTriggerResponse(
            deck_id=deck_id,
            message="Analysis already in progress",
            status="analyzing"
        )
    
    # Get user's thesis for context
    thesis = await thesis_service.get_thesis(user_id)
    
    # Update deck status
    await pdf_service.update_deck_status(deck_id, "analyzing")
    
    # Queue background analysis
    background_tasks.add_task(
        run_analysis_background,
        deck_id,
        deck.get("raw_text", ""),
        thesis
    )
    
    return AnalysisTriggerResponse(
        deck_id=deck_id,
        message="Analysis started. Poll GET /api/council/{deck_id} for results.",
        status="analyzing"
    )


@router.get("/{deck_id}", response_model=AnalysisResponse)
async def get_analysis(
    deck_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get the AI Council analysis for a deck.
    Returns the full analysis including all agent perspectives.
    """
    # Verify user owns this deck
    deck = await pdf_service.get_deck(deck_id, user_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Get analysis
    analysis = await council_service.get_analysis(deck_id)
    
    if not analysis:
        return AnalysisResponse(
            deck_id=deck_id,
            status=deck.get("status", "pending")
        )
    
    return AnalysisResponse(
        deck_id=deck_id,
        status=analysis.get("status", "analyzed"),
        optimist=analysis.get("optimist_analysis"),
        skeptic=analysis.get("skeptic_analysis"),
        quant=analysis.get("quant_analysis"),
        consensus=analysis.get("consensus", {})
    )
