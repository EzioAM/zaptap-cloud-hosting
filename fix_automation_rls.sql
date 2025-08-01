-- Fix RLS policies for automations table to allow public access to public automations

-- Enable RLS on automations table if not already enabled
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own automations" ON automations;
DROP POLICY IF EXISTS "Users can insert their own automations" ON automations;
DROP POLICY IF EXISTS "Users can update their own automations" ON automations;
DROP POLICY IF EXISTS "Users can delete their own automations" ON automations;
DROP POLICY IF EXISTS "Anyone can view public automations" ON automations;

-- Create policy to allow users to view their own automations
CREATE POLICY "Users can view their own automations"
ON automations
FOR SELECT
USING (auth.uid() = created_by);

-- Create policy to allow anyone (including unauthenticated users) to view public automations
CREATE POLICY "Anyone can view public automations"
ON automations
FOR SELECT
USING (is_public = true);

-- Create policy to allow users to insert their own automations
CREATE POLICY "Users can insert their own automations"
ON automations
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Create policy to allow users to update their own automations
CREATE POLICY "Users can update their own automations"
ON automations
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Create policy to allow users to delete their own automations
CREATE POLICY "Users can delete their own automations"
ON automations
FOR DELETE
USING (auth.uid() = created_by);

-- Note: Run this SQL in your Supabase SQL Editor to fix the automation access issues