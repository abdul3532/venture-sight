"""
Competitor Analyzer Tool - Researches competitive landscape for startups.
"""
import logging
from typing import Dict, Any, List
from duckduckgo_search import DDGS
from utils.observability import observe

logger = logging.getLogger(__name__)


@observe()
def analyze_competitors(
    startup_name: str,
    industry: str,
    keywords: List[str] = None
) -> Dict[str, Any]:
    """
    Search for and analyze competitors in the startup's space.
    
    Args:
        startup_name: Name of the startup being evaluated
        industry: Industry/sector of the startup
        keywords: Additional keywords to refine search
    
    Returns:
        Dict with competitor information and market landscape
    """
    competitors = []
    market_insights = []
    
    try:
        with DDGS() as ddgs:
            # Search for direct competitors
            search_query = f"{industry} startups competitors {' '.join(keywords or [])}"
            results = list(ddgs.text(search_query, max_results=5))
            
            for r in results:
                competitors.append({
                    "title": r.get("title", ""),
                    "snippet": r.get("body", ""),
                    "url": r.get("href", "")
                })
            
            # Search for recent funding in the space
            funding_query = f"{industry} startup funding 2024 2025"
            funding_results = list(ddgs.news(funding_query, max_results=3))
            
            for r in funding_results:
                market_insights.append({
                    "headline": r.get("title", ""),
                    "source": r.get("source", ""),
                    "url": r.get("url", "")
                })
                
    except Exception as e:
        logger.warning(f"Competitor search failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "competitors": [],
            "market_insights": []
        }
    
    # Analyze competitive positioning
    competitor_count = len(competitors)
    
    if competitor_count == 0:
        market_assessment = "Blue Ocean - Few direct competitors found"
        risk_level = "low"
    elif competitor_count <= 3:
        market_assessment = "Emerging Market - Limited competition"
        risk_level = "medium"
    else:
        market_assessment = "Competitive Market - Multiple players identified"
        risk_level = "high"
    
    return {
        "startup": startup_name,
        "industry": industry,
        "competitors_found": competitor_count,
        "market_assessment": market_assessment,
        "competitive_risk": risk_level,
        "competitors": competitors,
        "recent_market_activity": market_insights,
        "recommendation": _generate_recommendation(competitor_count, market_insights)
    }


def _generate_recommendation(competitor_count: int, market_insights: List) -> str:
    """Generate competitive analysis recommendation."""
    if competitor_count == 0:
        return "Verify if lack of competitors indicates untapped opportunity or market validation concerns."
    elif competitor_count <= 3 and len(market_insights) > 0:
        return "Market shows activity with manageable competition. Evaluate differentiation strategy."
    elif competitor_count > 3:
        return "Crowded space. Require clear differentiation and defensible moat explanation."
    else:
        return "Conduct deeper competitive analysis with founder."


# Tool schema for LLM function calling
COMPETITOR_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "analyze_competitors",
        "description": "Search for and analyze competitors in a startup's market. Returns competitive landscape assessment and recent market activity.",
        "parameters": {
            "type": "object",
            "properties": {
                "startup_name": {
                    "type": "string",
                    "description": "Name of the startup being evaluated"
                },
                "industry": {
                    "type": "string",
                    "description": "Industry or sector (e.g., 'fintech', 'B2B SaaS', 'healthtech')"
                },
                "keywords": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Additional keywords to refine competitor search"
                }
            },
            "required": ["startup_name", "industry"]
        }
    }
}
