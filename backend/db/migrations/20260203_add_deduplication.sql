-- Migration: Add deduplication support
-- 1. Add content_hash column
ALTER TABLE public.pitch_decks ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 2. Add indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_pitch_decks_hash ON public.pitch_decks(user_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_startup_name ON public.pitch_decks(user_id, startup_name);

-- 3. Note: We don't add UNIQUE constraints yet to avoid breaking partial uploads, 
-- but we will handle it in the application logic.
