"""
Council Service - Multi-Agent VC Analysis System.

The AI Council consists of:
- The Optimist (Visionary): Analyzes opportunities and disruption potential
- The Skeptic (Risk Officer): Identifies red flags and execution challenges  
- The Quant (Analyst): Evaluates financials, TAM, and traction metrics
- Consensus Agent: Synthesizes debate into Investment Memo with Match Score

UPDATED 2026: Now uses specialized ResearchService for external fact-checking.
"""
import os
import json
import logging
import asyncio
from utils.observability import observe, OpenAI, AsyncOpenAI
from db.client import supabase
from services.research_service import research_service

from config import settings
from services.prompts import OPTIMIST_PROMPT, SKEPTIC_PROMPT, QUANT_PROMPT, CONSENSUS_PROMPT

logger = logging.getLogger(__name__)

# OpenAI client (Wrapped) - Async
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class CouncilService:
    """Orchestrates the multi-agent VC Council analysis."""

    # Agent System Prompts (using centralized definitions)
    OPTIMIST_PROMPT = OPTIMIST_PROMPT
    SKEPTIC_PROMPT = SKEPTIC_PROMPT
    QUANT_PROMPT = QUANT_PROMPT
    CONSENSUS_PROMPT = CONSENSUS_PROMPT

    @observe()
    async def analyze_deck(self, deck_id: str, deck_text: str, thesis: Dict[str, Any]):
        """
        Main orchestration method:
        1. Research (TAM + Competitors)
        2. Parallel Agents (Optimist, Skeptic, Quant)
        3. Consensus Synthesis
        4. Save to DB
        """
        logger.info(f"Starting Council Analysis for {deck_id}")
        
        try:
            if not deck_text:
                logger.error("No deck text provided")
                return

            # --- Step 1: Research (The "Truth" Layer) ---
            # We need basic info first (Name, Industry). 
            # If not in DB, use LLM to extract quickly or just run extraction.
            # For now, let's try to extract from text if thesis/metadata is weak.
            
            # Simple extraction for Research context
            # (In a real scenario, we might use the ExtractionService here too)
            research_context = ""
            crm_update = {}
            
            try:
                # Basic context from thesis or text headers
                industry = thesis.get("target_sectors", ["Tech"])[0] 
                # (We could infer better, but let's rely on the ResearchService to be smart)
                
                # We'll use the Consensus agent to finalize CRM data, 
                # but we need some basics for Research.
                # Let's run a quick "pre-flight" check or just let Research run broadly?
                # Actually, let's skip complex pre-flight and just pass the Deck Text to research helpers.
                # But research helpers need structured inputs (Industry, Country).
                
                # Let's try to run ExtractionService if possible, or just skip to Agents if simple.
                # Run Extraction with Thesis constraints
                from services.extraction_service import extraction_service
                allowed_industries = thesis.get("target_sectors")
                metadata = await extraction_service.extract_metadata(deck_text[:10000], allowed_industries=allowed_industries)
                
                startup_name = metadata.get("startup_name", "Startup")
                industry = metadata.get("industry", "Technology")
                country = metadata.get("country", "Global")
                tagline = metadata.get("tagline", "") or metadata.get("one_liner", "")
                
                # Run Research Parallel
                tam_task = research_service.analyze_tam(deck_text, industry, country)
                # Pass full description for better search context
                description = metadata.get("description", "") or tagline
                comp_task = research_service.analyze_competitors(startup_name, tagline, industry, description)
                
                tam_result, comp_result = await asyncio.gather(tam_task, comp_task)
                
                # Prepare Research Context for Agents
                research_context = f"""
                VERIFIED RESEARCH DATA:
                
                [TAM ANALYSIS]
                - Estimated TAM: ${tam_result.get('tam_value', 'N/A')}
                - Market CAGR: {tam_result.get('market_metrics', {}).get('market_cagr', 'N/A')}
                - Market Stage: {tam_result.get('market_metrics', {}).get('growth_stage', 'N/A')}
                - Analyst Note: {tam_result.get('market_analysis', 'N/A')}
                
                [COMPETITIVE LANDSCAPE]
                - Identified Competitors: {', '.join([c['name'] for c in comp_result[:5]])}
                - Market Summary: {comp_result[0] if isinstance(comp_result, list) else 'N/A'}
                """
                
                # Store research for saving later
                crm_update = {
                    "tam": tam_result.get("tam_value"),
                    "sam": tam_result.get("sam_value"),
                    "som": tam_result.get("som_value"),
                    "tam_analysis": tam_result,
                    "competitors": comp_result,
                    # Fallback metadata if not present
                    "industry": industry,
                    "country": country,
                    "stage": metadata.get("stage"),
                    "business_model": metadata.get("business_model"),
                    "email": metadata.get("email"),
                    "team_size": metadata.get("team_size")
                }
                
            except Exception as e:
                logger.error(f"Research phase failed: {e}")
                research_context = "External research unavailable. Rely on deck claims."
                crm_update = {}

            # --- Step 2: Parallel Council Agents ---
            thesis_str = json.dumps(thesis, indent=2)
            
            optimist_task = self._run_agent("Optimist", self.OPTIMIST_PROMPT, deck_text, thesis_str, research_context)
            skeptic_task = self._run_agent("Skeptic", self.SKEPTIC_PROMPT, deck_text, thesis_str, research_context)
            quant_task = self._run_agent("Quant", self.QUANT_PROMPT, deck_text, thesis_str, research_context)
            
            optimist_res, skeptic_res, quant_res = await asyncio.gather(optimist_task, skeptic_task, quant_task)
            
            # --- Step 3: Consensus & Scoring ---
            consensus_res = await self._run_consensus(optimist_res, skeptic_res, quant_res, thesis_str, research_context)
            
            # --- Step 4: Merge & Save ---
            # Merge the Research CRM data with Consensus CRM data
            final_crm = {**crm_update, **consensus_res.get("crm_data", {})}
            
            # Ensure Consensus has the full picture
            consensus_res["crm_data"] = final_crm
            
            # Prepare record for 'council_analyses' table
            # NOTE: We only include columns that actually exist in the DB table.
            # 'final_score' and 'recommendation' are stored inside the 'consensus' JSONB, not as columns.
            analysis_record = {
                "deck_id": deck_id,
                "optimist_analysis": optimist_res, 
                "skeptic_analysis": skeptic_res,   
                "quant_analysis": quant_res,       
                "consensus": consensus_res
            }
            
            # Pass the extracted score separately or let _save_analysis extract it
            success = await self._save_analysis(analysis_record)
            
            # Also update the PitchDeck with the new CRM data (Industry, Stage, etc)
            # This "Heals" the dashboard if initial extraction was weak
            if success and supabase:
                try:
                    # Flatten some key fields for the main table if needed, 
                    # but mostly we rely on the crm_data JSONB column now.
                    # existing deck:
                    current_deck = supabase.table("pitch_decks").select("crm_data").eq("id", deck_id).single().execute()
                    current_crm = current_deck.data.get("crm_data") or {}
                    
                    merged_crm = {**current_crm, **final_crm}
                    
                    # Ensure tagline is explicitly set if available in final_crm
                    if final_crm.get("tagline"):
                         merged_crm["tagline"] = final_crm["tagline"]

                    supabase.table("pitch_decks").update({
                        "crm_data": merged_crm
                    }).eq("id", deck_id).execute()
                    logger.info(f"Updated CRM data for {deck_id}")
                except Exception as e:
                    logger.error(f"Failed to update CRM data: {e}")
            
            logger.info(f"Analysis complete for {deck_id}. Score: {consensus_res.get('final_score')}")
            
        except Exception as e:
            logger.error(f"Analysis failed for {deck_id}: {e}")
            # Try to set status to 'failed'
            if supabase:
                supabase.table("pitch_decks").update({"status": "failed"}).eq("id", deck_id).execute()


    @observe()
    async def _run_agent(
        self,
        agent_name: str,
        system_prompt: str,
        deck_text: str,
        thesis_context: str,
        research_context: str
    ) -> str:
        """Run a single analyst agent returning MARKDOWN string."""
        try:
            full_prompt = f"{system_prompt}\n\n{thesis_context}\n\n{research_context}"
            
            response = await client.chat.completions.create(
                model=settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": full_prompt},
                    {"role": "user", "content": f"Analyze this pitch deck:\n\n{deck_text[:15000]}"}
                ],
                # response_format={"type": "json_object"}, # REMOVED for individual agents
                temperature=settings.DEFAULT_TEMPERATURE
            )
            content = response.choices[0].message.content
            return content if content else f"{agent_name} failed to generate analysis."
        except Exception as e:
            logger.error(f"{agent_name} error: {e}")
            return f"Error running {agent_name}."

    @observe()
    async def _run_consensus(
        self,
        optimist: str,
        skeptic: str,
        quant: str,
        thesis_context: str,
        research_context: str
    ) -> Dict[str, Any]:
        """Run Consensus Agent returning JSON."""
        try:
            debate = f"""
            # OPTIMIST ANALYSIS:
            {optimist}
            
            # SKEPTIC ANALYSIS:
            {skeptic}
            
            # QUANT ANALYSIS:
            {quant}
            """
            
            full_prompt = f"{self.CONSENSUS_PROMPT}\n\n{thesis_context}\n\n{research_context}"
            
            response = await client.chat.completions.create(
                model=settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": full_prompt},
                    {"role": "user", "content": f"Synthesize debate:\n\n{debate}"}
                ],
                response_format={"type": "json_object"}, # Keep JSON for Consensus structure
                temperature=settings.FACTUAL_TEMPERATURE
            )
            content = response.choices[0].message.content
            result = json.loads(content) if content else {}
            
            # FORCE RECOMMENDATION LOGIC (Code > Prompt)
            # Ensure we don't rely on LLM for strict thresholds
            try:
                score = float(result.get("final_score", 0))
                
                # NORMALIZE SCORING (0-10 -> 0-100)
                # If the score is surprisingly low (<15), assume it's on a 1-10 scale and normalize it.
                if score > 0 and score <= 10.0:
                    score = score * 10
                    result["final_score"] = score # Update the result with the normalized score

                if score < 60.0:
                    result["recommendation"] = "Pass"
                elif score < 80.0:
                    result["recommendation"] = "Consider"
                else:
                    result["recommendation"] = "Invest"
            except Exception as e:
                logger.warning(f"Failed to force recommendation logic: {e}")

            return result
        except Exception as e:
            logger.error(f"Consensus error: {e}")
            return {}

    async def _save_analysis(self, analysis: Dict[str, Any]) -> bool:
        """Save to DB."""
        if not supabase: return False
        try:
            # 1. Upsert the Analysis record
            # Make sure 'analysis' dict matches the 'council_analyses' table columns EXACTLY
            supabase.table("council_analyses").upsert(analysis, on_conflict="deck_id").execute()
            
            # 2. Extract Score from Consensus for the Deck Table
            consensus = analysis.get("consensus", {})
            match_score = consensus.get("final_score", 0)
            
            # 3. Update Deck Status & Score
            supabase.table("pitch_decks").update({
                "status": "analyzed",
                "match_score": match_score
            }).eq("id", analysis["deck_id"]).execute()
            
            return True
        except Exception as e:
            logger.error(f"Save failed: {e}")
            return False

    async def get_analysis(self, deck_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve analysis + Smart/Research Data."""
        if not supabase: return None
        try:
            # 1. Fetch Analysis
            analysis_resp = supabase.table("council_analyses").select("*").eq("deck_id", deck_id).execute()
            analysis = analysis_resp.data[0] if analysis_resp.data else {}
            
            # 2. Fetch Deck Data (containing Smart Extraction + Research Results)
            deck_resp = supabase.table("pitch_decks").select("crm_data").eq("id", deck_id).single().execute()
            crm = deck_resp.data.get("crm_data", {}) if deck_resp.data else {}
            
            # 3. Merge Strategies
            if not analysis:
                return {
                    "deck_id": deck_id,
                    "status": "pending_council",
                    "consensus": {"crm_data": crm} # Pass Research data even if council pending
                }
            
            # Merge CRM into Consensus for frontend convenience
            if "consensus" not in analysis: analysis["consensus"] = {}
            analysis["consensus"]["crm_data"] = crm
            
            return analysis
        except Exception as e:
            logger.error(f"Get analysis failed: {e}")
            return None

council_service = CouncilService()
