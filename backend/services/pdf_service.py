"""
PDF Service - Handles pitch deck PDF ingestion and text extraction.
"""
import os
import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from io import BytesIO
import uuid
import base64
from PIL import Image
import concurrent.futures

logger = logging.getLogger(__name__)

# Try to import pdfplumber, fall back gracefully
try:
    import pdfplumber
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("pdfplumber not installed. PDF extraction will be limited.")

from db.client import supabase
from config import settings


class PDFService:
    """Service for pitch deck PDF processing."""

    def __init__(self):
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=3)

    async def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """
        Extract all text content from a PDF file.
        Runs primarily in a thread pool to avoid blocking the async event loop.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, self._extract_text_sync, file_bytes)

    def _extract_text_sync(self, file_bytes: bytes) -> str:
        """Synchronous CPU-bound extraction logic."""
        if not PDF_SUPPORT:
            return "[PDF extraction not available - install pdfplumber]"
        
        try:
            text_parts = []
            pdfium_doc = None
            
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                for i, page in enumerate(pdf.pages):
                    # 1. Try standard text extraction
                    page_text = page.extract_text() or ""
                    
                    # 2. Vision Fallback: If text is sparse (< 150 chars), assume image/scan
                    if len(page_text.strip()) < 150:
                        logger.info(f"Page {i+1}: Low text content ({len(page_text.strip())} chars). Attempting Vision extraction.")
                        try:
                            if not pdfium_doc:
                                import pypdfium2 as pdfium
                                pdfium_doc = pdfium.PdfDocument(BytesIO(file_bytes))
                            
                            renderer = pdfium_doc[i]
                            bitmap = renderer.render(scale=2.0) 
                            pil_image = bitmap.to_pil()
                            
                            # Extract with Vision (SYNC call is fine inside run_in_executor)
                            vision_text = self._extract_with_vision_sync(pil_image)
                            
                            if vision_text:
                                page_text = f"--- [Vision Extracted Page {i+1}] ---\n{vision_text}\n"
                        except Exception as ve:
                             logger.error(f"Vision extraction failed for page {i+1}: {ve}")
                    
                    if page_text:
                        text_parts.append(page_text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return f"[Error extracting PDF: {str(e)}]"

    def _extract_with_vision_sync(self, image: Image.Image) -> str:
        """
        Synchronous Vision extraction for use within thread pool.
        """
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            buffered = BytesIO()
            image.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise OCR engine. Extract ALL text from this slide. "
                                   "If there are charts, graphs, or architectural diagrams, describe them in detail (e.g. 'Bar chart showing 50% YoY growth'). "
                                   "Do not add conversational filler. Just output the content."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_str}"}}
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.0
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI Vision error: {e}")
            return ""

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks."""
        if not text: return []
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            if end < len(text):
                last_period = chunk.rfind('.')
                last_newline = chunk.rfind('\n')
                break_point = max(last_period, last_newline)
                if break_point > chunk_size // 2:
                    chunk = text[start:start + break_point + 1]
                    end = start + break_point + 1
            chunks.append(chunk.strip())
            start = end - overlap
        return [c for c in chunks if c]

    async def save_upload(self, user_id: str, filename: str, file_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Step 1: Fast save to DB to create a pending record.
        """
        if not supabase: return None
        try:
            import hashlib
            content_hash = hashlib.sha256(file_bytes).hexdigest()
            
            # Check for existing duplicate (exact content)
            existing_response = supabase.table("pitch_decks")\
                .select("id, status, startup_name")\
                .eq("user_id", user_id)\
                .eq("content_hash", content_hash)\
                .execute()
                
            if existing_response.data:
                existing_deck = existing_response.data[0]
                logger.info(f"Duplicate content detected for {existing_deck['startup_name']} (ID: {existing_deck['id']}). Skipping ingestion.")
                return existing_deck

            # Create placeholder record
            deck_data = {
                "user_id": user_id,
                "filename": filename,
                "startup_name": "Processing...",  # Placeholder
                "raw_text": "",
                "status": "pending", # Changed from 'processing' to satisfy DB constraint
                "content_hash": content_hash,
                "crm_data": {}
            }
            
            response = supabase.table("pitch_decks").insert(deck_data).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error saving upload: {e}")
            return None

    async def upload_deck_from_text(self, user_id: str, filename: str, raw_text: str, startup_name: str) -> Dict[str, Any]:
        """
        Directly ingest text content as a deck record.
        Used by the AI Associate to promote chat context to the CRM.
        """
        if not supabase: raise Exception("Supabase not initialized")
        
        try:
            import hashlib
            content_hash = hashlib.sha256(raw_text.encode('utf-8')).hexdigest()
            
            # 1. Create record
            deck_data = {
                "user_id": user_id,
                "filename": filename or f"{startup_name}.txt",
                "startup_name": startup_name,
                "raw_text": raw_text,
                "status": "pending",
                "content_hash": content_hash,
                "crm_data": {}
            }
            
            response = supabase.table("pitch_decks").insert(deck_data).execute()
            if not response.data:
                raise Exception("Failed to insert deck record")
            
            deck = response.data[0]
            
            # 2. Trigger async background tasks (RAG + Research)
            from services.rag_service import rag_service
            asyncio.create_task(rag_service.ingest_deck(deck['id'], raw_text))
            
            # Analysis is triggered by add_deal in pipeline.py, so we just return the record
            return deck
            
        except Exception as e:
            logger.error(f"upload_deck_from_text error: {e}")
            raise e

    async def process_deck_background(self, deck_id: str, file_bytes: bytes, user_id: str):
        """
        Step 2: Heavy lifting in background.
        Extracts text, metadata, and triggers Council/RAG.
        """
        logger.info(f"Starting background processing for deck {deck_id}")
        try:
            # 1. Extract Text (Thread Pool)
            raw_text = await self.extract_text_from_pdf(file_bytes)
            
            if not raw_text or len(raw_text) < 50:
                logger.warning(f"Detailed extraction failed for {deck_id}")
                supabase.table("pitch_decks").update({"status": "failed", "notes": "Text extraction failed"}).eq("id", deck_id).execute()
                return

            # 2. Smart Metadata Extraction
            logger.info(f"Running extraction for {deck_id}...")
            thesis = None
            metadata = {}
            try:
                from services.extraction_service import extraction_service
                from services.thesis_service import thesis_service

                thesis = await thesis_service.get_thesis(user_id)
                allowed_industries = thesis.get("target_sectors") if thesis else None

                metadata = await extraction_service.extract_metadata(raw_text, allowed_industries=allowed_industries)
            except Exception as e:
                logger.error(f"Smart extraction failed: {e}")
                metadata = {}

            # 3. Determine Name and Update Record
            startup_name = metadata.get("startup_name")
            if not startup_name:
                # Basic heuristic
                lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
                startup_name = lines[0] if lines and len(lines[0]) < 50 else "Unknown Startup"

            crm_data = {
                "country": metadata.get("country"),
                "industry": metadata.get("industry"),
                "business_model": metadata.get("business_model"),
                "stage": metadata.get("stage"),
                "email": metadata.get("email"),
                "tam": metadata.get("tam"),
                "team_size": metadata.get("team_size"),
                "tagline": metadata.get("tagline")
            }

            # Update the deck with text and basic metadata
            update_data = {
                "startup_name": startup_name,
                "raw_text": raw_text,
                "status": "pending",
                "crm_data": crm_data
            }
            supabase.table("pitch_decks").update(update_data).eq("id", deck_id).execute()
            logger.info(f"Deck {deck_id} updated with extracted metadata.")

            # 4. Trigger RAG Ingestion
            from services.rag_service import rag_service
            await rag_service.ingest_deck(deck_id, raw_text)
            
            # 5. AUTO-TRIGGER COUNCIL ANALYSIS
            logger.info(f"Auto-triggering Council Analysis for {deck_id}...")
            from services.council_service import council_service
            # We use analyze_deck which already handles backgrounding via decorators/logic if called normally,
            # but here we are ALREADY in a background task, so we await it.
            await council_service.analyze_deck(deck_id, raw_text, thesis or {})
            
            logger.info(f"Background processing complete for {deck_id}")

        except Exception as e:
            logger.error(f"Fatal error in background processing for {deck_id}: {e}")
            supabase.table("pitch_decks").update({"status": "failed"}).eq("id", deck_id).execute()

    async def get_deck(self, deck_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific deck by ID."""
        if not supabase: return None
        try:
            response = supabase.table("pitch_decks").select("*").eq("id", deck_id).eq("user_id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching deck: {e}")
            return None

    async def list_decks(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all decks for a user, handling enrichment."""
        if not supabase: return []
        try:
            query = supabase.table("pitch_decks").select(
                "id, filename, startup_name, match_score, status, uploaded_at, crm_data, council_analyses(*)"
            ).eq("user_id", user_id)
            
            if status:
                query = query.eq("status", status)
            else:
                query = query.neq("status", "archived")
            
            response = query.order("uploaded_at", desc=True).execute()
            decks = response.data or []
            
            enriched_decks = []
            for deck in decks:
                smart_data = deck.get("crm_data") or {}
                analyses = deck.get("council_analyses", [])
                analysis_data = {}
                
                analysis = analyses[0] if isinstance(analyses, list) and analyses else analyses if isinstance(analyses, dict) else None
                
                if analysis:
                    consensus = analysis.get("consensus")
                    if isinstance(consensus, dict):
                         analysis_data = consensus.get("crm_data", {})
                
                final_crm = {**smart_data}
                for k, v in analysis_data.items():
                    if v is not None and v != "":
                        final_crm[k] = v
                
                if smart_data.get("tam") and not analysis_data.get("tam"):
                    final_crm["tam"] = smart_data["tam"]
                
                # Assign fields for Dashboard
                deck["country"] = final_crm.get("country") or smart_data.get("country") or "—"
                deck["industry"] = final_crm.get("industry") or smart_data.get("industry") or "—"
                deck["model"] = final_crm.get("business_model") or smart_data.get("business_model") or "—"
                deck["series"] = final_crm.get("stage") or smart_data.get("stage") or "—"
                deck["email"] = final_crm.get("email") or smart_data.get("email") or "N/A"
                deck["team_size"] = final_crm.get("team_size") or smart_data.get("team_size")
                deck["tagline"] = final_crm.get("tagline") or smart_data.get("tagline") or "Innovating in the venture space"
                deck["sam"] = final_crm.get("sam") or smart_data.get("sam")
                deck["som"] = final_crm.get("som") or smart_data.get("som")
                
                tam_str = final_crm.get("tam") or smart_data.get("tam")
                deck["tam"] = None
                if tam_str and isinstance(tam_str, (int, float)):
                    deck["tam"] = float(tam_str)
                elif tam_str:
                    try:
                        deck["tam"] = float(str(tam_str).replace(",","").replace("$","").strip())
                    except:
                        pass
                
                if "council_analyses" in deck:
                    del deck["council_analyses"]
                    
                enriched_decks.append(deck)
                
            return enriched_decks
        except Exception as e:
            logger.error(f"Error listing decks: {e}")
            return []
    
    async def update_deck_status(self, deck_id: str, status: str, match_score: Optional[float] = None) -> bool:
        """Update deck status."""
        if not supabase: return False
        try:
            update_data = {"status": status}
            if match_score is not None:
                update_data["match_score"] = match_score
            supabase.table("pitch_decks").update(update_data).eq("id", deck_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating deck status: {e}")
            return False

    async def delete_deck(self, deck_id: str, user_id: str) -> bool:
        """Permanently delete a deck and its associated data."""
        if not supabase: return False
        try:
            supabase.table("deck_chunks").delete().eq("deck_id", deck_id).execute()
            supabase.table("council_analyses").delete().eq("deck_id", deck_id).execute()
            supabase.table("pitch_decks").delete().eq("id", deck_id).eq("user_id", user_id).execute()
            logger.info(f"Deleted deck {deck_id} and all its data.")
            return True
        except Exception as e:
            logger.error(f"Error deleting deck: {e}")
            return False

pdf_service = PDFService()
