"""
Thesis API - Endpoints for managing VC investment thesis.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dependencies import get_current_user
from services.thesis_service import thesis_service

router = APIRouter(prefix="/api/thesis", tags=["thesis"])


class ThesisCreate(BaseModel):
    """Request model for creating/updating thesis."""
    thesis_text: str
    target_sectors: List[str]
    geography: str
    check_size_min: int
    check_size_max: int
    preferred_stage: str
    anti_thesis: List[str] = []


class ThesisResponse(BaseModel):
    """Response model for thesis."""
    id: str
    thesis_text: str
    target_sectors: List[str]
    geography: str
    check_size_min: int
    check_size_max: int
    preferred_stage: str
    anti_thesis: List[str]


@router.get("", response_model=Optional[ThesisResponse])
async def get_thesis(user_id: str = Depends(get_current_user)):
    """Get the current user's investment thesis."""
    thesis = await thesis_service.get_thesis(user_id)
    return thesis


@router.post("", response_model=ThesisResponse)
async def create_or_update_thesis(
    thesis: ThesisCreate,
    user_id: str = Depends(get_current_user)
):
    """Create or update the user's investment thesis."""
    result = await thesis_service.create_or_update_thesis(
        user_id=user_id,
        thesis_text=thesis.thesis_text,
        target_sectors=thesis.target_sectors,
        geography=thesis.geography,
        check_size_min=thesis.check_size_min,
        check_size_max=thesis.check_size_max,
        preferred_stage=thesis.preferred_stage,
        anti_thesis=thesis.anti_thesis
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to save thesis")
    
    return result
