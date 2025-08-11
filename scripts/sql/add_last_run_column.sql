-- Add last_run_at column to automations table
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP WITH TIME ZONE;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_automations_last_run_at 
ON automations(last_run_at);

-- Update RLS policies to include the new column
-- (The existing policies should already cover this, but just to be safe)

-- Allow users to update their own automations including execution count
DROP POLICY IF EXISTS "Users can update own automations" ON automations;

CREATE POLICY "Users can update own automations"
ON automations
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);