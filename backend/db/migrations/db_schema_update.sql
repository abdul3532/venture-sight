-- Run this in your Supabase SQL Editor to fix the missing columns

ALTER TABLE news_articles 
ADD COLUMN IF NOT EXISTS impact_reason TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS related_sources TEXT[] DEFAULT '{}';

-- Optional: Update existing rows to have default empty values if needed (the DEFAULT above handles new ones)
UPDATE news_articles SET impact_reason = '' WHERE impact_reason IS NULL;
UPDATE news_articles SET related_sources = '{}' WHERE related_sources IS NULL;
