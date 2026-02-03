"""
Thesis Service - Manages VC investment thesis CRUD operations.
The thesis is used to ground all AI agents for personalized evaluations.
"""
from typing import Optional, Dict, Any, List
import logging
from db.client import supabase

logger = logging.getLogger(__name__)


class ThesisService:
    """Service for managing VC thesis (investment criteria)."""

    async def get_thesis(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the user's investment thesis."""
        if not supabase:
            logger.warning("Supabase client not initialized")
            return None
        
        try:
            response = supabase.table("vc_thesis").select("*").eq("user_id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching thesis: {e}")
            return None

    async def create_or_update_thesis(
        self,
        user_id: str,
        thesis_text: str,
        target_sectors: List[str],
        geography: str,
        check_size_min: int,
        check_size_max: int,
        preferred_stage: str,
        anti_thesis: List[str]
    ) -> Optional[Dict[str, Any]]:
        """Create or update the user's investment thesis (upsert)."""
        if not supabase:
            logger.warning("Supabase client not initialized")
            return None
        
        try:
            data = {
                "user_id": user_id,
                "thesis_text": thesis_text,
                "target_sectors": target_sectors,
                "geography": geography,
                "check_size_min": check_size_min,
                "check_size_max": check_size_max,
                "preferred_stage": preferred_stage,
                "anti_thesis": anti_thesis
            }
            
            response = supabase.table("vc_thesis").upsert(
                data, 
                on_conflict="user_id"
            ).execute()
            
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error upserting thesis: {e}")
            return None

    def build_system_prompt_context(self, thesis: Dict[str, Any]) -> str:
        """
        Build a context string from the thesis for injection into agent system prompts.
        This ensures all AI evaluations are grounded in the VC's specific criteria.
        """
        if not thesis:
            return "No investment thesis defined. Provide general VC analysis."
        
        sectors = ", ".join(thesis.get("target_sectors", []))
        anti = ", ".join(thesis.get("anti_thesis", []))
        
        return f"""
INVESTMENT THESIS CONTEXT:
- Focus: {thesis.get('thesis_text', 'General')}
- Target Sectors: {sectors or 'Any'}
- Geography: {thesis.get('geography', 'Global')}
- Check Size: ${thesis.get('check_size_min', 0):,} - ${thesis.get('check_size_max', 0):,}
- Preferred Stage: {thesis.get('preferred_stage', 'Any')}
- Sectors to AVOID: {anti or 'None specified'}

Evaluate all pitch decks against these criteria. Flag mismatches clearly.
"""


thesis_service = ThesisService()
