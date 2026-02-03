"""
AI Associate Service - The "Junior Analyst" conversational AI for VentureSight.

Architecture:
1. Council Service = First pass analysis when deck is uploaded
2. AI Associate = Follow-up questions, uses Council results as context

This service provides:
- Contextual Q&A about analyzed pitch decks
- Function calling tools (from /tools folder)
- Multi-turn dialogue with memory
- Integration with thesis context and council analysis results
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from utils.observability import observe, OpenAI
from db.client import supabase
from services.thesis_service import thesis_service

# Import tools and schemas
from tools.search import perform_web_search
from tools.competitor_analyzer import analyze_competitors
from tools.tam_calculator import calculate_tam, estimate_sam_som
from tools.funding_benchmarker import benchmark_funding
from tools.investment_readiness import grade_investment_readiness

from tools.pipeline import (
    get_pipeline_summary,
    list_decks,
    search_decks,
    get_deal_details,
    add_deal,
    delete_deal,
    update_thesis,
    _get_council_results, 
    _format_council_context
)

from tools.schemas import ALL_TOOLS

from config import settings
from services.prompts import ASSOCIATE_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Lazy OpenAI client
_client = None


def _get_client():
    global _client
    if not _client:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


# ============================================================
# TOOL EXECUTION
# ============================================================

async def _execute_tool(tool_name: str, args: dict, user_id: str, document_context: Optional[str] = None) -> str:
    """Execute a tool and return the result as a string."""
    logger.info(f"Executing tool: {tool_name} with args: {args}")
    
    try:
        if tool_name == "search_web":
            return perform_web_search(args["query"])
        
        elif tool_name == "analyze_competitors":
            result = analyze_competitors(
                startup_name=args["startup_name"],
                industry=args["industry"],
                keywords=args.get("keywords")
            )
            return json.dumps(result, indent=2)
            
        elif tool_name == "calculate_tam":
            result = calculate_tam(
                market=args["market"],
                region=args.get("region", "Global")
            )
            return json.dumps(result, indent=2)
            
        elif tool_name == "estimate_sam_som":
            result = estimate_sam_som(
                tam_value=args["tam_value"],
                business_model=args.get("business_model", "B2B")
            )
            return json.dumps(result, indent=2)
        
        elif tool_name == "benchmark_funding":
            result = benchmark_funding(
                funding_ask=args["funding_ask"],
                stage=args["stage"],
                mrr=args.get("mrr"),
                team_size=args.get("team_size"),
                sector=args.get("sector", "General")
            )
            return json.dumps(result, indent=2)
        
        elif tool_name == "grade_investment_readiness":
            result = grade_investment_readiness(
                criteria_scores=args["criteria_scores"],
                stage=args.get("stage", "Seed")
            )
            return json.dumps(result, indent=2)
        
        elif tool_name == "search_decks":
            return await search_decks(args["query"], user_id)
        
        elif tool_name == "list_decks":
            return await list_decks(user_id, args.get("limit", 10))
            
        elif tool_name == "get_deal_details":
            return await get_deal_details(args["startup_name"], user_id)
            
        elif tool_name == "update_thesis":
            return await update_thesis(user_id, **args)
            
        elif tool_name == "get_pipeline_summary":
            return await get_pipeline_summary(user_id)

        elif tool_name == "add_deal":
            return await add_deal(args["startup_name"], args.get("filename"), user_id, document_context)

        elif tool_name == "delete_deal":
            return await delete_deal(args["startup_name"], user_id)
        
        else:
            return f"Unknown tool: {tool_name}"
            
    except Exception as e:
        logger.error(f"Tool execution error for {tool_name}: {e}")
        return f"Tool execution failed: {str(e)}"


# ============================================================
# MAIN AGENT LOOP
# ============================================================

@observe()
async def chat_with_associate(
    query: str,
    user_id: str,
    document_context: Optional[str] = None,
    deck_id: Optional[str] = None,
    deck_ids: Optional[List[str]] = None,
    history: List[Dict] = []
) -> str:
    """
    Main chat function for the AI Associate.
    """
    
    # Get user's thesis for context
    thesis = await thesis_service.get_thesis(user_id)
    thesis_context = thesis_service.build_system_prompt_context(thesis) if thesis else ""
    
    # Get council results if analyzing a specific deck
    council_context = ""
    if deck_id:
        council_results = await _get_council_results(deck_id)
        council_context = _format_council_context(council_results)
    
    # RAG Context & Explicit Deck Content
    from services.rag_service import rag_service
    rag_context = ""
    target_decks = deck_ids or ([deck_id] if deck_id else None)
    
    if target_decks:
        # 1. Direct Context Injection (Fetch raw text for selected decks)
        try:
            if supabase:
                response = supabase.table("pitch_decks").select("startup_name, raw_text").in_("id", target_decks).execute()
                deals = response.data or []
                
                if deals:
                    rag_context += "\n\n=== SELECTED DECK CONTENT ===\n"
                    for d in deals:
                        # Truncate to avoid context window explosion (user design: ~8k chars)
                        content = d.get('raw_text', '')[:8000] 
                        rag_context += f"-- Startup: {d.get('startup_name')}\n{content}\n\n"
        except Exception as e:
            logger.error(f"Failed to fetch deck context: {e}")

        # 2. Vector Search (Supplement with specific chunks if query exists)
        if query:
            try:
                chunks = await rag_service.search_related_chunks(query, deck_ids=target_decks, limit=5)
                if chunks:
                    rag_context += "\n\n=== RELEVANT SEMANTIC CHUNKS ===\n"
                    for c in chunks:
                        rag_context += f"-- Related Chunk: {c.get('content')}\n\n"
            except Exception as e:
                logger.warning(f"RAG search failed: {e}")
    
    elif query:
        # General search across all decks if no specific deck selected
        try:
            chunks = await rag_service.search_related_chunks(query, limit=5)
            if chunks:
                rag_context = "\n\n=== RELEVANT DECK EXCERPTS ===\n"
                for c in chunks:
                    rag_context += f"-- Source Deck: {c.get('deck_id')}\n{c.get('content')}\n\n"
        except Exception as e:
            logger.warning(f"RAG search failed: {e}")

    # Aggressive System Prompt
    from datetime import datetime
    current_date = datetime.now().strftime("%B %d, %Y")
    
    system_prompt = ASSOCIATE_SYSTEM_PROMPT.format(
        current_date=current_date,
        thesis_context=thesis_context,
        council_context=council_context,
        rag_context=rag_context,
        available_tools=", ".join([t['function']['name'] for t in ALL_TOOLS])
    )

    if document_context:
        system_prompt += f"\n\nCURRENT DECK CONTEXT:\n{document_context[:10000]}"

    # Build messages
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-8:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": query})
    
    # Agentic loop
    for _ in range(5):
        try:
            response = _get_client().chat.completions.create(
                model=settings.DEFAULT_MODEL,
                messages=messages,
                tools=ALL_TOOLS,
                tool_choice="auto",
                temperature=settings.DEFAULT_TEMPERATURE
            )
            
            message = response.choices[0].message
            messages.append(message)
            
            if message.tool_calls:
                for tool_call in message.tool_calls:
                    fn_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)
                    result = await _execute_tool(fn_name, args, user_id, document_context)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": str(result)
                    })
            else:
                return message.content or "I'm ready to help."
                
        except Exception as e:
            logger.error(f"AI Associate error: {e}")
            return f"Error: {str(e)}"
    
    return messages[-1].content if hasattr(messages[-1], 'content') else "I need more information."
