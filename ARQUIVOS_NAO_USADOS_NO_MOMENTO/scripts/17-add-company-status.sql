-- Add status column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'pending'));

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
