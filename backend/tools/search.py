from duckduckgo_search import DDGS
import logging
from typing import List, Dict
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True
)
def _ddg_search_execution(query: str, max_results: int, mode: str = "text") -> List[Dict]:
    """Internal helper to execute DDG search with retry logic."""
    with DDGS() as ddgs:
        if mode == "news":
            return list(ddgs.news(query, max_results=max_results))
        return list(ddgs.text(query, max_results=max_results))

def perform_web_search(query: str, max_results: int = 3) -> str:
    """
    Executes a web search using DuckDuckGo and returns formatted results.
    Includes automatic retry logic and news fallback.
    """
    logger.info(f"Executing web search for: {query}")
    try:
        results = []
        
        # 1. Try regular text search
        try:
            results = _ddg_search_execution(query, max_results, mode="text")
        except Exception as e:
            logger.warning(f"Text search failed after retries: {e}. Trying news fallback.")
        
        # 2. Fallback to news search if text failed or returned no results
        if not results:
            try:
                results = _ddg_search_execution(query, max_results, mode="news")
            except Exception as e:
                logger.error(f"News fallback also failed: {e}")
        
        if not results:
            return "No results found for this query."
            
        formatted_results = []
        for r in results:
            # Handle different keys for news search (body/snippet)
            title = r.get('title', 'No Title')
            link = r.get('href') or r.get('url') or 'No Link'
            snippet = r.get('body') or r.get('snippet') or 'No Content'
            date = r.get('date', 'Recent')
            formatted_results.append(f"Title: {title}\nDate: {date}\nLink: {link}\nSnippet: {snippet}\n")
            
        return "\n---\n".join(formatted_results)
        
    except Exception as e:
        logger.error(f"Web search tool failed completely: {e}")
        return f"Error executing search: {str(e)}"
