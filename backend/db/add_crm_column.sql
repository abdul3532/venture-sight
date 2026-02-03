-- Migration: Add crm_data to pitch_decks
-- Purpose: Store the fast metadata extraction results (Phase 1 Smart Extraction)
-- Run this in your Supabase SQL Editor

ALTER TABLE public.pitch_decks 
ADD COLUMN IF NOT EXISTS crm_data JSONB;

-- Comment on column
COMMENT ON COLUMN public.pitch_decks.crm_data IS 'Structured metadata (TAM, Country, Stage) extracted immediately upon upload';
