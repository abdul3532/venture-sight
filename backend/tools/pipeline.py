
import logging
import asyncio
from typing import Optional, Dict
from db.client import supabase
from services.thesis_service import thesis_service

logger = logging.getLogger(__name__)

# ============================================================
# PIPELINE / CRM TOOLS
# ============================================================

async def get_pipeline_summary(user_id: str) -> str:
    """Summarize the entire pipeline."""
    try:
        from services.pdf_service import pdf_service
        decks = await pdf_service.list_decks(user_id)
        if not decks:
            return "Your pipeline is currently empty."
            
        total = len(decks)
        top_deals = sorted([d for d in decks if d.get('match_score')], key=lambda x: x['match_score'], reverse=True)[:3]
        
        summary = f"Pipeline Summary: {total} total deals.\n"
        if top_deals:
            summary += "\nTop Rated Startups:\n"
            for d in top_deals:
                summary += f"- {d.get('startup_name')} (Score: {d.get('match_score')}/100)\n"
                summary += f"  Industry: {d.get('industry') or 'General'} | Stage: {d.get('series') or 'N/A'}\n"
        
        # Breakdown by industry
        industries = {}
        for d in decks:
            ind = d.get('industry') or "Unknown"
            industries[ind] = industries.get(ind, 0) + 1
        
        summary += "\nIndustry Breakdown:\n"
        for ind, count in sorted(industries.items(), key=lambda x: x[1], reverse=True)[:5]:
            summary += f"- {ind}: {count} deals\n"
            
        return summary
    except Exception as e:
        logger.error(f"Pipeline summary error: {e}")
        return "Could not generate pipeline summary."

async def update_thesis(user_id: str, **kwargs) -> str:
    """Update investment thesis."""
    try:
        # Get existing thesis to merge updates
        current = await thesis_service.get_thesis(user_id) or {}
        
        updated_data = {
            "user_id": user_id,
            "thesis_text": kwargs.get("thesis_text", current.get("thesis_text", "")),
            "target_sectors": kwargs.get("target_sectors", current.get("target_sectors", [])),
            "geography": kwargs.get("geography", current.get("geography", "Global")),
            "check_size_min": kwargs.get("check_size_min", current.get("check_size_min", 0)),
            "check_size_max": kwargs.get("check_size_max", current.get("check_size_max", 0)),
            "preferred_stage": kwargs.get("preferred_stage", current.get("preferred_stage", "Any")),
            "anti_thesis": kwargs.get("anti_thesis", current.get("anti_thesis", []))
        }
        
        res = await thesis_service.create_or_update_thesis(**updated_data)
        if res:
            return "Investment thesis updated successfully. I will ground future evaluations in these new criteria."
        return "Failed to update thesis."
    except Exception as e:
        logger.error(f"Update thesis error: {e}")
        return f"Update failed: {str(e)}"

async def search_decks(query: str, user_id: str) -> str:
    """Search through previously uploaded decks using RAG."""
    try:
        from services.rag_service import rag_service
        chunks = await rag_service.search_related_chunks(query, limit=5)
        
        if not chunks:
            return "No matching content found in your decks."
            
        result = "Found mentions in these decks:\n"
        for c in chunks:
            result += f"- [Deck {c.get('deck_id', 'Unknown')}]: {c.get('content', '')[:200]}...\n"
            
        return result
    except Exception as e:
        logger.error(f"Deck search error: {e}")
        return "Deck search temporarily unavailable."

async def list_decks(user_id: str, limit: int = 10) -> str:
    """List recent decks."""
    try:
        from services.pdf_service import pdf_service
        decks = await pdf_service.list_decks(user_id, status=None)
        
        if not decks:
            return "No decks found in your portfolio."
            
        result = f"Found {len(decks)} decks (showing top {limit}):\n"
        for d in decks[:limit]:
            result += f"- {d.get('startup_name', 'Unnamed')} (File: {d.get('filename')}) - Score: {d.get('match_score', 'N/A')} - Status: {d.get('status')} - Uploaded: {d.get('uploaded_at')}\n"
            
        return result
    except Exception as e:
        logger.error(f"List decks error: {e}")
        return "Could not list decks."

async def get_deal_details(startup_name: str, user_id: str) -> str:
    """Fetch structured council analysis for a startup."""
    try:
        from services.pdf_service import pdf_service
        # Find deck by name
        decks = await pdf_service.list_decks(user_id)
        target_deck = next((d for d in decks if d.get('startup_name', '').lower() == startup_name.lower()), None)
        
        if not target_deck:
            # Try partial match
            target_deck = next((d for d in decks if startup_name.lower() in d.get('startup_name', '').lower()), None)
            
        if not target_deck:
            return f"No deal found matching '{startup_name}'."
            
        # Get full analysis using existing helper
        results = await _get_council_results(target_deck['id'])
        if not results:
            return f"Found deck for '{target_deck['startup_name']}' but no analysis results are available yet."
            
        # Format the structured data
        summary = _format_council_context(results)
        
        return f"Structured Analysis for {target_deck['startup_name']}:\n{summary}"

    except Exception as e:
        logger.error(f"Get deal details error: {e}")
        return "Could not retrieve deal details."

async def add_deal(startup_name: str, filename: str, user_id: str, document_context: str) -> str:
    """Promote a chat document to a CRM deal."""
    if not document_context or len(document_context) < 100:
        return "I can't add this to the CRM because there's no pitch deck content in our current conversation. Please upload a PDF first."
        
    try:
        from services.pdf_service import pdf_service
        from services.council_service import council_service
        
        # Get thesis for context
        thesis = await thesis_service.get_thesis(user_id)
        
        # 1. Create the deal
        deck = await pdf_service.upload_deck_from_text(
            user_id=user_id,
            filename=filename or f"{startup_name}_imported.txt",
            raw_text=document_context,
            startup_name=startup_name
        )
        
        # 2. Trigger Council Analysis in background (don't await)
        asyncio.create_task(council_service.analyze_deck(deck['id'], document_context, thesis))
        
        return f"Successfully added '{startup_name}' to your CRM! I've initiated a full analysis by my Council of Agents. You'll see it on your dashboard shortly."
        
    except Exception as e:
        logger.error(f"Add deal error: {e}")
        return f"Failed to add deal: {str(e)}"

async def delete_deal(startup_name: str, user_id: str) -> str:
    """Delete a deal from CRM."""
    try:
        from services.pdf_service import pdf_service
        # Find deck by name
        decks = await pdf_service.list_decks(user_id)
        target_deck = next((d for d in decks if d.get('startup_name', '').lower() == startup_name.lower()), None)
        
        if not target_deck:
            return f"I couldn't find a startup named '{startup_name}' in your CRM to delete."
            
        success = await pdf_service.delete_deck(target_deck['id'], user_id)
        if success:
            return f"Successfully wiped '{startup_name}' and all its associated analysis from your CRM."
        return f"Failed to delete '{startup_name}'."
        
    except Exception as e:
        logger.error(f"Delete deal error: {e}")
        return f"Error during deletion: {str(e)}"

async def fetch_deck_from_url(url: str, startup_name: str, user_id: str) -> str:
    """Download and ingest a pitch deck PDF from a URL."""
    try:
        import httpx
        from services.pdf_service import pdf_service
        
        logger.info(f"Downloading deck from {url} for {startup_name}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.content
            
        if not content:
            return "Failed to download any content from the provided URL."
            
        filename = url.split("/")[-1].split("?")[0] or f"{startup_name}.pdf"
        if not filename.lower().endswith(".pdf"):
            filename += ".pdf"
            
        # 1. Fast Save
        deck = await pdf_service.save_upload(
            user_id=user_id,
            filename=filename,
            file_bytes=content
        )
        
        if not deck:
            return "Failed to initiate upload for the downloaded deck."
            
        # 2. Start Background Processing
        # We don't await this so the AI can respond quickly
        asyncio.create_task(pdf_service.process_deck_background(deck["id"], content, user_id))
        
        return f"Successfully downloaded and queued '{startup_name}' for analysis! It will appear in your pipeline once processing is complete."
        
    except Exception as e:
        logger.error(f"Fetch from URL error: {e}")
        return f"Failed to download/ingest deck: {str(e)}"

# ============================================================
# HELPERS (MOVED FROM ASSISTANT SERVICE)
# ============================================================

async def _get_council_results(deck_id: str) -> Optional[Dict]:
    """Fetch the council analysis results for a deck."""
    if not supabase or not deck_id:
        return None
    
    try:
        response = supabase.table("council_analyses").select("*").eq(
            "deck_id", deck_id
        ).single().execute()
        return response.data if response.data else None
    except Exception as e:
        logger.warning(f"Could not fetch council results: {e}")
        return None

def _format_council_context(council_results: Dict) -> str:
    """Format council analysis results as context for the AI Associate."""
    if not council_results:
        return ""
    
    context = "\n=== COUNCIL ANALYSIS RESULTS ===\n"
    consensus = council_results.get("consensus", {})
    if isinstance(consensus, dict):
        match_score = consensus.get("match_score") or consensus.get("final_score")
        if match_score:
            context += f"Overall Score: {match_score}/100\n"
        if consensus.get("recommendation"):
            context += f"Recommendation: {consensus.get('recommendation')}\n"
        
        # Fixing key: prompt uses consensus_summary
        summary = consensus.get("consensus_summary") or consensus.get("summary")
        if summary:
            context += f"Executive Summary: {summary}\n"
            
        memo = consensus.get("investment_memo")
        if memo:
            context += f"\nDetailed Investment Memo:\n{memo}\n"

    # Add CRM Metrics
    crm_data = council_results.get("consensus", {}).get("crm_data", {})
    if not crm_data:
        crm_data = council_results.get("crm_data", {})

    if crm_data:
        context += "\n=== KEY METRICS ===\n"
        if crm_data.get('tagline'):
            context += f"Tagline: {crm_data.get('tagline')}\n"
        if crm_data.get('description'):
            context += f"Product Description: {crm_data.get('description')}\n"
            
        context += f"Industry: {crm_data.get('industry') or 'N/A'}\n"
        context += f"Stage: {crm_data.get('stage') or crm_data.get('series') or 'N/A'}\n"
        context += f"Team Size: {crm_data.get('team_size') or 'N/A'}\n"
        context += f"Business Model: {crm_data.get('business_model') or crm_data.get('model') or 'N/A'}\n"
        
        tam = crm_data.get('tam')
        if tam:
            context += f"TAM: ${tam}\n"
        if crm_data.get('country'):
            context += f"Location: {crm_data.get('country')}\n"
    
    # Add agent perspectives (briefly)
    context += "\n=== AGENT PERSPECTIVES ===\n"
    for agent in ["optimist", "skeptic", "quant"]:
        if council_results.get(agent):
            agent_data = council_results[agent]
            context += f"\n{agent.upper()} REPORT:\n"
            if isinstance(agent_data, dict):
                # If they returned an object, flatten it
                for key, value in agent_data.items():
                    context += f"  - {key}: {value}\n"
            else:
                # Individual reports are now Markdown strings - taking first 500 chars for brevity
                context += f"  {str(agent_data)[:500]}...\n"
                
    return context
