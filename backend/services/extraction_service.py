"""
Extraction Service - Dedicated agent for extracting structured metadata from pitch decks.
Focuses on accuracy of factual fields (Name, TAM, Stage) rather than subjective analysis.
"""
import os
import json
import logging
from typing import Dict, Any, Optional, List
from utils.observability import AsyncOpenAI
from pydantic import BaseModel, Field

from config import settings
from services.prompts import EXTRACTION_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Lazy load client
_client = None

def get_client():
    global _client
    if not _client:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client

class StartupMetadata(BaseModel):
    """Structured extraction schema."""
    startup_name: str = Field(..., description="The official name of the startup. Fix capitalization.")
    tagline: str = Field(..., description="Short 3-5 word CATCHY description of what they do.")
    description: str = Field(..., description="2-3 sentence summary of the product and value proposition.")
    country: Optional[str] = Field(None, description="Headquarters location.")
    industry: Optional[str] = Field(None, description="Primary industry sector (e.g. Fintech, Healthtech).")
    business_model: Optional[str] = Field(None, description="B2B, B2C, Marketplace, Enterprise, etc.")
    stage: Optional[str] = Field(None, description="Current investment stage (Pre-Seed, Seed, Series A).")
    funding_ask: Optional[str] = Field(None, description="Amount they are raising (e.g. '$2M').")
    tam: Optional[str] = Field(None, description="Total Addressable Market size (e.g. '$5B'). Extract raw string.")
    team_size: Optional[int] = Field(None, description="Number of founders or employees if mentioned.")
    email: Optional[str] = Field(None, description="Contact email for the founder.")
    website: Optional[str] = Field(None, description="Startup website URL.")

class ExtractionService:
    """Service to run the 'Data Clerk' agent."""
    
    SYSTEM_PROMPT = EXTRACTION_SYSTEM_PROMPT

    async def extract_metadata(self, text: str, allowed_industries: Optional[List[str]] = None) -> Dict[str, Any]:
        """Run extraction on deck text."""
        try:
            client = get_client()
            
            # Use a smaller context window for cost/speed
            input_text = text[:10000] 
            
            industry_instruction = ""
            if allowed_industries:
                industry_instruction = f"\nCRITICAL: The 'industry' MUST be chosen from this list: {', '.join(allowed_industries)}."

            response = await client.chat.completions.create(
                model=settings.DEFAULT_MODEL,  # Use smart model for accuracy
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT + industry_instruction},
                    {"role": "user", "content": f"Extract metadata from this pitch deck content:\n\n{input_text}"}
                ],
                # response_format={"type": "json_object"},  <-- REMOVED: Conflicts with function_call
                functions=[{
                    "name": "extract_data",
                    "description": "Extract structured data from text",
                    "parameters": StartupMetadata.model_json_schema()
                }],
                function_call={"name": "extract_data"},
                temperature=settings.FACTUAL_TEMPERATURE  # Very low temp for factual accuracy
            )
            
            function_args = json.loads(response.choices[0].message.function_call.arguments)
            return function_args
            
        except Exception as e:
            logger.error(f"Metadata extraction failed: {e}")
            return {}

extraction_service = ExtractionService()
