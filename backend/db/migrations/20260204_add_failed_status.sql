-- Migration: Add 'failed' status to pitch_decks
-- This allows the system to properly track decks that failed processing

-- Drop the existing constraint
ALTER TABLE public.pitch_decks DROP CONSTRAINT IF EXISTS pitch_decks_status_check;

-- Add the updated constraint with 'failed' status
ALTER TABLE public.pitch_decks ADD CONSTRAINT pitch_decks_status_check
  CHECK (status IN ('pending', 'analyzing', 'analyzed', 'archived', 'failed'));
