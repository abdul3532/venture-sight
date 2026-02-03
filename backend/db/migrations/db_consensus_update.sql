ALTER TABLE council_analyses 
ADD COLUMN IF NOT EXISTS consensus JSONB;

-- Optional: Add specific CRM columns if you prefer flattened structure
-- ALTER TABLE council_analyses ADD COLUMN IF NOT EXISTS crm_data JSONB;
