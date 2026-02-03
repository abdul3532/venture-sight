-- Enable pgvector extension
create extension if not exists vector;

-- Create deck_chunks table
create table if not exists deck_chunks (
    id uuid primary key default gen_random_uuid(),
    deck_id uuid references pitch_decks(id) on delete cascade not null,
    content text not null,
    metadata jsonb default '{}'::jsonb,
    embedding vector(1536),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster semantic search
create index if not exists deck_chunks_embedding_idx on deck_chunks 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Function to match chunks
create or replace function match_deck_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_deck_ids uuid[] default null
)
returns table (
  id uuid,
  deck_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    deck_chunks.id,
    deck_chunks.deck_id,
    deck_chunks.content,
    1 - (deck_chunks.embedding <=> query_embedding) as similarity
  from deck_chunks
  where 1 - (deck_chunks.embedding <=> query_embedding) > match_threshold
  and (filter_deck_ids is null or deck_chunks.deck_id = any(filter_deck_ids))
  order by deck_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
