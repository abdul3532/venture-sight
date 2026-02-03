import os
import logging
from typing import List, Dict, Any, Optional
from utils.observability import OpenAI
from db.client import supabase

logger = logging.getLogger(__name__)

# Lazy OpenAI client
_client = None

def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return _client

class RAGService:
    def __init__(self):
        self.embedding_model = "text-embedding-3-small"

    def _get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI."""
        try:
            text = text.replace("\n", " ")
            return _get_client().embeddings.create(
                input=[text], 
                model=self.embedding_model
            ).data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []

    async def ingest_deck(self, deck_id: str, text: str):
        """Chunk text and store embeddings for a deck."""
        if not text or not deck_id:
            return

        try:
            # 1. Chunk the text (reuse pdf_service or simple chunker here)
            chunks = self._chunk_text(text)
            logger.info(f"Ingesting {len(chunks)} chunks for deck {deck_id}")

            # 2. Generate embeddings and prepare rows
            rows = []
            for chunk in chunks:
                embedding = self._get_embedding(chunk)
                if embedding:
                    rows.append({
                        "deck_id": deck_id,
                        "content": chunk,
                        "embedding": embedding,
                        "metadata": {"source": "pdf_upload"}
                    })

            # 3. Insert into Supabase
            if rows and supabase:
                # Insert in batches of 50 to avoid request limits
                batch_size = 50
                for i in range(0, len(rows), batch_size):
                    batch = rows[i:i + batch_size]
                    supabase.table("deck_chunks").insert(batch).execute()
                
                logger.info(f"Successfully ingested deck {deck_id}")

        except Exception as e:
            logger.error(f"Error ingesting deck {deck_id}: {e}")

    async def search_related_chunks(
        self, 
        query: str, 
        deck_ids: Optional[List[str]] = None, 
        limit: int = 8,
        match_threshold: float = 0.35
    ) -> List[Dict[str, Any]]:
        """Search for relevant chunks using vector similarity with keyword fallback."""
        if not supabase:
            return []

        try:
            # 1. Generate query embedding
            query_embedding = self._get_embedding(query)
            chunks = []
            
            if query_embedding:
                # 2. Call Supabase RPC for Vector Search
                params = {
                    "query_embedding": query_embedding,
                    "match_threshold": match_threshold,
                    "match_count": limit,
                    "filter_deck_ids": deck_ids
                }
                
                response = supabase.rpc("match_deck_chunks", params).execute()
                chunks = response.data or []

            # 3. Hybrid Fallback: If no vector results, try keyword search
            if len(chunks) < 2:
                logger.info(f"Vector search yielded few results for '{query}', falling back to keyword search.")
                keyword_results = await self.keyword_search_fallback(query, deck_ids, limit=limit)
                
                # Merge and deduplicate
                existing_ids = {c.get("id") for c in chunks}
                for kr in keyword_results:
                    if kr.get("id") not in existing_ids:
                        chunks.append(kr)
            
            # Format results
            results = []
            for chunk in chunks:
                results.append({
                    "id": chunk.get("id"),
                    "content": chunk.get("content"),
                    "similarity": chunk.get("similarity", 0.9), # Synthetic similarity for keywords
                    "deck_id": chunk.get("deck_id")
                })
            
            return results[:limit]

        except Exception as e:
            logger.error(f"Error searching chunks: {e}")
            return []

    async def keyword_search_fallback(
        self, 
        query: str, 
        deck_ids: Optional[List[str]] = None, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Fallback keyword search using ILIKE."""
        if not supabase:
            return []
            
        try:
            # Search in deck_chunks content
            builder = supabase.table("deck_chunks").select("id, deck_id, content")
            
            if deck_ids:
                builder = builder.in_("deck_id", deck_ids)
                
            # Basic keyword filter
            response = builder.ilike("content", f"%{query}%").limit(limit).execute()
            
            return response.data or []
        except Exception as e:
            logger.error(f"Keyword search error: {e}")
            return []

    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Simple text chunker."""
        if not text:
            return []
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            # Try to break at a newline or period
            if end < len(text):
                last_period = chunk.rfind('.')
                if last_period > chunk_size // 2:
                    end = start + last_period + 1
            
            chunks.append(text[start:end].strip())
            start = end - overlap
        
        return [c for c in chunks if c]

rag_service = RAGService()
