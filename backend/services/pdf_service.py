"""
PDF Service - Handles pitch deck PDF ingestion and text extraction.
"""
import os
import json
import logging
from typing import Optional, Dict, Any, List
from io import BytesIO
import uuid
import base64
from PIL import Image

logger = logging.getLogger(__name__)

# Try to import pdfplumber, fall back gracefully
try:
    import pdfplumber
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("pdfplumber not installed. PDF extraction will be limited.")

from db.client import supabase


class PDFService:
    """Service for pitch deck PDF processing."""

    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extract all text content from a PDF file."""
        if not PDF_SUPPORT:
            return "[PDF extraction not available - install pdfplumber]"
        
        try:
            text_parts = []
            
            # --- VISION SUPPORT SETUP ---
            # We'll initialize pypdfium2 only if needed to save resources
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
                            
                            # Render page to image (scale=2 for better OCR resolution)
                            renderer = pdfium_doc[i]
                            bitmap = renderer.render(scale=2.0) 
                            pil_image = bitmap.to_pil()
                            
                            # Extract with Vision
                            vision_text = self._extract_with_vision(pil_image)
                            
                            if vision_text:
                                # Append vision text, noting it was OCR'd
                                page_text = f"--- [Vision Extracted Page {i+1}] ---\n{vision_text}\n"
                            else:
                                logger.warning(f"Page {i+1}: Vision returned empty text.")
                                
                        except Exception as ve:
                             logger.error(f"Vision extraction failed for page {i+1}: {ve}")
                             # Fallback: Just keep the original sparse text
                    
                    if page_text:
                        text_parts.append(page_text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return f"[Error extracting PDF: {str(e)}]"

    def _extract_with_vision(self, image: Image.Image) -> str:
        """
        Send image to GPT-4o for text extraction and scene description.
        """
        try:
            from utils.observability import OpenAI
            # Standard client init (relies on OPENAI_API_KEY env var)
            client = OpenAI()
            
            # Convert PIL to base64
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
                                   "Do not add conversational filler like 'Here is the text'. Just output the content."
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{img_str}",
                                    "detail": "high"
                                }
                            }
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
        """
        Split text into overlapping chunks for embedding.
        Uses simple character-based chunking with overlap.
        """
        if not text:
            return []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            
            # Try to break at sentence boundary if possible
            if end < len(text):
                last_period = chunk.rfind('.')
                last_newline = chunk.rfind('\n')
                break_point = max(last_period, last_newline)
                if break_point > chunk_size // 2:
                    chunk = text[start:start + break_point + 1]
                    end = start + break_point + 1
            
            chunks.append(chunk.strip())
            start = end - overlap
        
        return [c for c in chunks if c]  # Filter empty chunks

    async def upload_deck(
        self,
        user_id: str,
        filename: str,
        file_bytes: bytes
    ) -> Optional[Dict[str, Any]]:
        """
        Process and store a pitch deck PDF.
        Returns the created deck record.
        """
        if not supabase:
            logger.warning("Supabase client not initialized")
            return None
        
        try:
            # Generate content hash for deduplication
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

            # Extract text from PDF
            raw_text = self.extract_text_from_pdf(file_bytes)
            
            # --- PHASE 1: SMART EXTRACTION ---
            # Instead of guessing, we use the Extraction Agent
            logger.info(f"Running smart metadata extraction on {len(raw_text)} chars...")
            print(f"DEBUG: Extracted text start: {raw_text[:200]}")
            
            try:
                from services.extraction_service import extraction_service
                # Fetch thesis for industry constraints
                from services.thesis_service import thesis_service
                thesis = await thesis_service.get_thesis(user_id)
                allowed_industries = thesis.get("target_sectors") if thesis else None

                metadata = await extraction_service.extract_metadata(raw_text, allowed_industries=allowed_industries)
                print(f"DEBUG: Smart Extraction Result: {json.dumps(metadata, indent=2)}")
                logger.info(f"Smart Extraction Result: {metadata}")
            except Exception as e:
                logger.error(f"Smart extraction failed: {e}")
                print(f"DEBUG: Extraction Exception: {e}")
                metadata = {}

            # Use extracted name or fallback to heuristic/filename
            startup_name = metadata.get("startup_name")
            if not startup_name:
                startup_name = self._extract_startup_name(raw_text, filename)
                print(f"DEBUG: Fallback Name Used: {startup_name}")
            
            # Prepare CRM data to save immediately
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

            # Create deck record with rich data
            deck_data = {
                "user_id": user_id,
                "filename": filename,
                "startup_name": startup_name,
                "raw_text": raw_text,
                "status": "pending",
                "content_hash": content_hash, # Track content for exact de-duping
                "crm_data": crm_data  # Store the initial smart extraction here
            }
            
            # PHASE 2: Check for Name-based Match (Startup already in CRM)
            try:
                name_match = supabase.table("pitch_decks")\
                    .select("id, status")\
                    .eq("user_id", user_id)\
                    .eq("startup_name", startup_name)\
                    .neq("status", "archived")\
                    .execute()
                
                if name_match.data:
                    # An entry already exists for this startup.
                    # We'll update the existing record with the new text and hash.
                    existing_id = name_match.data[0]['id']
                    logger.info(f"Existing startup '{startup_name}' (ID: {existing_id}) found. Updating record with new deck content.")
                    
                    response = supabase.table("pitch_decks")\
                        .update(deck_data)\
                        .eq("id", existing_id)\
                        .execute()
                else:
                    response = supabase.table("pitch_decks").insert(deck_data).execute()
            except Exception as e:
                logger.warning(f"Name-based deduplication lookup failed: {e}")
                response = supabase.table("pitch_decks").insert(deck_data).execute()
            
            if response.data:
                deck = response.data[0]
                logger.info(f"Saved deck record: {deck['id']} for {startup_name}")
                
                # Ingest for RAG (async/background)
                try:
                    from services.rag_service import rag_service
                    await rag_service.ingest_deck(deck['id'], raw_text)
                except Exception as e:
                    logger.error(f"RAG ingestion failed: {e}")
                
                return deck
            
            return None
        except Exception as e:
            logger.error(f"Error uploading deck: {e}")
            return None

    def _extract_startup_name(self, text: str, filename: str) -> str:
        """Try to extract startup name from PDF content or filename."""
        # Simple heuristic: first non-empty line is often the company name
        if text:
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            if lines:
                first_line = lines[0]
                # If it looks like a title (not too long, no common headers)
                if len(first_line) < 50 and first_line.lower() not in ['pitch deck', 'investor deck', 'executive summary']:
                    return first_line
        
        # Fall back to filename without extension
        name = os.path.splitext(filename)[0]
        return name.replace('_', ' ').replace('-', ' ').title()

    async def get_deck(self, deck_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific deck by ID."""
        if not supabase:
            return None
        
        try:
            response = supabase.table("pitch_decks").select("*").eq("id", deck_id).eq("user_id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching deck: {e}")
            return None

    async def list_decks(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all decks for a user, optionally filtered by status."""
        if not supabase:
            return []
        
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
            
            # Enrich with CRM data from Smart Extraction OR Council Analysis
            enriched_decks = []
            for deck in decks:
                # 1. Start with the direct extraction data (Phase 1)
                smart_data = deck.get("crm_data") or {}
                
                # 2. Check for deeper Council analysis
                analyses = deck.get("council_analyses", [])
                analysis_data = {}
                
                analysis = None
                if isinstance(analyses, list) and analyses:
                    analysis = analyses[0]
                elif isinstance(analyses, dict):
                    analysis = analyses
                
                if analysis:
                    consensus = analysis.get("consensus")
                    if isinstance(consensus, dict):
                         analysis_data = consensus.get("crm_data", {})
                
                # 3. Merge: Council analysis overwrites Smart Extraction if avail (usually deeper)
                # We do this carefully to avoid overwriting valid smart_data with None/empty values from analysis
                final_crm = {**smart_data}
                for k, v in analysis_data.items():
                    if v is not None and v != "":
                        final_crm[k] = v
                
                # If Smart Extraction found a better TAM, presume it wins over Council "None"
                if smart_data.get("tam") and not analysis_data.get("tam"):
                    final_crm["tam"] = smart_data["tam"]
                
                # Assign fields for Dashboard
                deck["country"] = final_crm.get("country") or smart_data.get("country")
                deck["industry"] = final_crm.get("industry") or smart_data.get("industry")
                deck["model"] = final_crm.get("business_model") or smart_data.get("business_model")
                deck["series"] = final_crm.get("stage") or smart_data.get("stage")
                deck["email"] = final_crm.get("email") or smart_data.get("email")
                deck["team_size"] = final_crm.get("team_size") or smart_data.get("team_size")
                deck["tagline"] = final_crm.get("tagline") or smart_data.get("tagline")
                deck["sam"] = final_crm.get("sam") or smart_data.get("sam")
                deck["som"] = final_crm.get("som") or smart_data.get("som")
                
                # Parse TAM
                tam_str = final_crm.get("tam")
                deck["tam"] = None
                if tam_str and isinstance(tam_str, (int, float)):
                    deck["tam"] = float(tam_str)
                elif tam_str and str(tam_str).replace(",","").replace(".","").isdigit():
                    deck["tam"] = float(str(tam_str).replace(",",""))
                
                if "council_analyses" in deck:
                    del deck["council_analyses"]
                    
                enriched_decks.append(deck)
                
            return enriched_decks
        except Exception as e:
            logger.error(f"Error listing decks: {e}")
            return []

    async def update_deck_status(self, deck_id: str, status: str, match_score: Optional[float] = None) -> bool:
        """Update deck status and optionally match score."""
        if not supabase:
            return False
        
        try:
            update_data = {"status": status}
            if match_score is not None:
                update_data["match_score"] = match_score
            
            supabase.table("pitch_decks").update(update_data).eq("id", deck_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating deck status: {e}")
            return False


    async def upload_deck_from_text(self, user_id: str, filename: str, raw_text: str, startup_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Mirror of upload_deck but for cases where we already have the text (e.g. chat upload).
        """
        try:
            # 1. Extraction (Smart CRM entry)
            try:
                from services.extraction_service import extraction_service
                from services.thesis_service import thesis_service
                thesis = await thesis_service.get_thesis(user_id)
                allowed_industries = thesis.get("target_sectors") if thesis else None
                
                metadata = await extraction_service.extract_metadata(raw_text, allowed_industries=allowed_industries)
            except Exception as e:
                logger.error(f"Chat-to-CRM extraction failed: {e}")
                metadata = {}

            if not startup_name:
                startup_name = metadata.get("startup_name") or filename.split('.')[0].replace('-', ' ').title()

            # Generate content hash for de-duping
            import hashlib
            content_hash = hashlib.sha256(raw_text.encode()).hexdigest()

            # PHASE 1: Exact Content Check
            try:
                existing_response = supabase.table("pitch_decks")\
                    .select("id, startup_name")\
                    .eq("user_id", user_id)\
                    .eq("content_hash", content_hash)\
                    .execute()
                
                if existing_response.data:
                    existing_deck = existing_response.data[0]
                    logger.info(f"Duplicate text content detected for {existing_deck['startup_name']}. Skipping creation.")
                    return existing_deck
            except Exception:
                pass

            # Prepare CRM data
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

            deck_data = {
                "user_id": user_id,
                "filename": filename,
                "startup_name": startup_name,
                "raw_text": raw_text,
                "status": "pending",
                "content_hash": content_hash,
                "crm_data": crm_data
            }

            # PHASE 2: Name-based match lookup
            try:
                name_match = supabase.table("pitch_decks")\
                    .select("id")\
                    .eq("user_id", user_id)\
                    .eq("startup_name", startup_name)\
                    .neq("status", "archived")\
                    .execute()
                
                if name_match.data:
                    existing_id = name_match.data[0]['id']
                    logger.info(f"Existing startup '{startup_name}' found in CRM. Updating record.")
                    response = supabase.table("pitch_decks").update(deck_data).eq("id", existing_id).execute()
                else:
                    response = supabase.table("pitch_decks").insert(deck_data).execute()
            except Exception:
                response = supabase.table("pitch_decks").insert(deck_data).execute()
            if not response.data:
                raise Exception("Failed to insert deck record")

            deck = response.data[0]
            
            # 3. Trigger Async Jobs (RAG + Council)
            # RAG Ingestion
            from services.rag_service import rag_service
            import asyncio
            asyncio.create_task(rag_service.ingest_deck(deck['id'], raw_text))
            
            # Note: Council Analysis is triggered by the caller (Assistant) via triggerAnalysis usually,
            # but we return the deck object.
            
            return deck

        except Exception as e:
            logger.error(f"upload_deck_from_text error: {e}")
            raise e


    async def delete_deck(self, deck_id: str, user_id: str) -> bool:
        """Permanently delete a deck and its associated data."""
        if not supabase:
            return False
        
        try:
            # 1. Delete associated data first (Council analyses, RAG chunks, etc.)
            # RAG chunks are in 'deck_chunks' table
            supabase.table("deck_chunks").delete().eq("deck_id", deck_id).execute()
            
            # 2. Delete council analysis
            supabase.table("council_analyses").delete().eq("deck_id", deck_id).execute()
            
            # 3. Delete the deck itself
            supabase.table("pitch_decks").delete().eq("id", deck_id).eq("user_id", user_id).execute()
            
            # NOTE: If we had storage files, we'd delete them here too.
            
            logger.info(f"Deleted deck {deck_id} and all its data.")
            return True
        except Exception as e:
            logger.error(f"Error deleting deck: {e}")
            return False


pdf_service = PDFService()
