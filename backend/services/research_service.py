"""
Research Service - Specialized Agents for Market & Competitor validation.
Focus: External Verification (Web Search) vs Internal Deck Claims.
"""
import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from utils.observability import observe, OpenAI
from duckduckgo_search import DDGS
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import settings
from services.prompts import (
    TAM_RESEARCH_PROMPT, 
    TAM_ANALYSIS_PROMPT, 
    COMPETITOR_RESEARCH_PROMPT, 
    COMPETITOR_INTEL_PROMPT, 
    COMPETITOR_SCORING_PROMPT
)

logger = logging.getLogger(__name__)

# Lazy load client
_client = None

def get_client():
    global _client
    if not _client:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client

# --- Data Models ---

class MarketMetrics(BaseModel):
    market_cagr: str = Field(..., description="CAGR with % symbol, e.g. '15.2%'")
    entry_barrier: str = Field(..., description="Low/Medium/High")
    competition_level: str = Field(..., description="Low/Medium/High")
    growth_stage: str = Field(..., description="Early/Growth/Mature")

class TAMAnalysis(BaseModel):
    tam_value: int = Field(..., description="TAM in USD (number)")
    sam_value: int = Field(..., description="SAM in USD (number)")
    som_value: int = Field(..., description="SOM in USD (number)")
    market_metrics: MarketMetrics
    market_analysis: str = Field(..., description="2-3 paragraphs analyzing market dynamics.")
    deck_comparison: str = Field(..., description="Comparison of Deck claims vs. Reality found in search.")

class Competitor(BaseModel):
    name: str
    website: str = Field(..., description="Clean URL e.g. 'stripe.com'")
    similarity: int = Field(..., description="0-100 score")
    funding: str = Field(..., description="Total funding e.g. '$50M' or 'Bootstrapped'")
    team_size: str = Field(..., description="e.g. '100-500'")
    description: str = Field(..., description="1 sentence description")

class CompetitorAnalysis(BaseModel):
    competitors: List[Competitor]
    market_summary: str = Field(..., description="Summary of the competitive landscape")


class ResearchService:
    """Orchestrates specific agents for TAM and Competitor research."""
    
    # Agent System Prompts (using centralized definitions)
    SYSTEM_PROMPT_TAM = TAM_ANALYSIS_PROMPT
    SYSTEM_PROMPT_COMPETITORS = COMPETITOR_SCORING_PROMPT

    @observe()
    async def analyze_tam(self, deck_text: str, industry: str, country: str) -> Dict[str, Any]:
        """
        Run TAM Agent with Smart Web Search.
        Uses LLM to generate specific search queries based on deck content first.
        """
        logger.info(f"Starting TAM Research for {industry} in {country}")
        
        # 1. Generate Smart Queries
        try:
            client = get_client()
            query_response = client.chat.completions.create(
                model=settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": TAM_RESEARCH_PROMPT},
                    {"role": "user", "content": f"Startup in {industry} ({country}).\nDeck Content:\n{deck_text[:2000]}\n\nOutput only the 3 queries, one per line."}
                ],
                temperature=settings.FACTUAL_TEMPERATURE
            )
            raw_queries = query_response.choices[0].message.content.strip().split("\n")
            smart_queries = [q.strip("- ").strip() for q in raw_queries if q.strip()]
        except Exception:
            smart_queries = [] # Fallback to default

        # 2. Web Search
        search_context = self._search_market(industry, country, smart_queries)
        
        # 3. LLM Analysis
        try:
            client = get_client()
            response = client.chat.completions.create(
                model=settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT_TAM},
                    {"role": "user", "content": f"""
                    CONTEXT:
                    Industry: {industry}
                    Region: {country}
                    
                    DECK SNIPPET:
                    {deck_text[:5000]}
                    
                    SEARCH FINDINGS:
                    {search_context}
                    
                    Provide a structured market analysis.
                    """}
                ],
                functions=[{
                    "name": "report_tam",
                    "parameters": TAMAnalysis.model_json_schema()
                }],
                function_call={"name": "report_tam"},
                temperature=settings.FACTUAL_TEMPERATURE
            )
            
            args = json.loads(response.choices[0].message.function_call.arguments)
            return args
        except Exception as e:
            logger.error(f"TAM Analysis failed: {e}")
            return {}

    @observe()
    async def analyze_competitors(self, startup_name: str, tagline: str, industry: str, description: str = "") -> Dict[str, Any]:
        """
        Run Competitor Agent with Smart Web Search.
        Uses LLM to think of the "Job to be Done" search queries (e.g. "Pitch practice tools").
        """
        logger.info(f"Starting Competitor Search for {startup_name}")
        
        # 1. Generate Smart Queries (The "Brain" Step)
            query_response = client.chat.completions.create(
                model=settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": COMPETITOR_RESEARCH_PROMPT},
                    {"role": "user", "content": f"""
                    STARTUP: {startup_name}
                    INDUSTRY: {industry}
                    DESCRIPTION: {context_text}
                    
                    Generate 4 specific web search queries to find DIRECT and INDIRECT competitors.
                    
                    CRITICAL INSTRUCTION:
                    - Do NOT search for the name of the startup itself.
                    - Think about the SPECIFIC problem they solve (e.g. instead of "Fintech", search for "AI-powered credit scoring for SMEs").
                    - Include a query for "Alternatives to [category]" or "[category] software comparison".
                    - Keywords should be high-intent and niche.
                    
                    Output only the 4 queries, one per line.
                    """}
                ],
                temperature=settings.FACTUAL_TEMPERATURE
            )
            raw_queries = query_response.choices[0].message.content.strip().split("\n")
            smart_queries = [q.strip("- ").strip() for q in raw_queries if q.strip()]
            logger.info(f"Smart Competitor Queries: {smart_queries}")
        except Exception as e:
            logger.warning(f"Smart query generation failed: {e}")
            smart_queries = [] 

        # 2. Web Search
        search_context = self._search_competitors(startup_name, tagline, industry, description, smart_queries)
        
        # 3. LLM Analysis
        try:
            client = get_client()
            response = client.chat.completions.create(
                model=settings.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT_COMPETITORS},
                    {"role": "user", "content": f"""
                    STARTUP: {startup_name} - {tagline}
                    INDUSTRY: {industry}
                    DESCRIPTION: {context_text}
                    
                    SEARCH FINDINGS:
                    {search_context}
                    
                    Identify the top 5 most relevant LIVING competitors. 
                    - Avoid generic category giants (e.g. don't link Microsoft if they just have a generic feature).
                    - Focus on tools that solve the SAME specific problem.
                    - Return structured data.
                    """}
                ],
                functions=[{
                    "name": "report_competitors",
                    "parameters": CompetitorAnalysis.model_json_schema()
                }],
                function_call={"name": "report_competitors"},
                temperature=settings.FACTUAL_TEMPERATURE
            )
            
            args = json.loads(response.choices[0].message.function_call.arguments)
            return args.get("competitors", [])
        except Exception as e:
            logger.error(f"Competitor Analysis failed: {e}")
            return []

    # --- Helper Search Functions ---
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=False # Don't crash for search issues
    )
    def _search_market(self, industry: str, country: str, smart_queries: List[str] = []) -> str:
        """Search for market size reports."""
        queries = smart_queries if smart_queries else [
            f"{industry} market size {country} 2024 2025",
            f"{industry} market CAGR growth report",
            f"major trends in {industry} {country}"
        ]
        
        # Add a generic fallback if smart queries fail to produce results
        if smart_queries and len(queries) < 2:
             queries.append(f"{industry} market size {country}")

        results = []
        try:
            with DDGS() as ddgs:
                for q in queries[:4]: # Limit to 4 queries
                    logger.info(f"Searching Market: {q}")
                    r = list(ddgs.text(q, max_results=3)) 
                    if not r:
                        logger.info(f"Text search returned no results for market query '{q}', trying news fallback.")
                        r = list(ddgs.news(q, max_results=3))
                    
                    results.extend([f"Source: {x['title']}\nSnippet: {x.get('body') or x.get('snippet')}" for x in r])
        except Exception as e:
            logger.warning(f"Market search failed: {e}")
            
        return "\n\n".join(results[:10])

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=False # Don't crash for search issues
    )
    def _search_competitors(self, startup_name: str, tagline: str, industry: str, description: str = "", smart_queries: List[str] = []) -> str:
        """Search for competitors using smart queries."""
        
        # If we have smart queries from the LLM, use those primarily
        if smart_queries:
            queries = smart_queries
        else:
            # Fallback to rule-based
            desc_snippet = description[:60] if description else tagline[:60]
            queries = [
                f"competitors to {startup_name} {industry}",
                f"startups similar to {startup_name}",
                f"best {industry} apps for {desc_snippet}",
                f"alternatives to {startup_name} {tagline[:30]}", 
                f"companies building {desc_snippet}" 
            ]
            
        results = []
        try:
            with DDGS() as ddgs:
                for q in queries:
                    logger.info(f"Searching Competitors: {q}")
                    r = list(ddgs.text(q, max_results=5)) 
                    if not r:
                        logger.info(f"Text search returned no results for competitor query '{q}', trying news fallback.")
                        r = list(ddgs.news(q, max_results=5))
                        
                    results.extend([f"Source: {x['title']}\nSnippet: {x.get('body') or x.get('snippet')}\nURL: {x.get('href') or x.get('url')}" for x in r])
        except Exception as e:
            logger.warning(f"Competitor search failed: {e}")
            
        return "\n\n".join(results[:20]) # Increased context

research_service = ResearchService()
