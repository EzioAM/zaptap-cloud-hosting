-- Fix RLS policy for users table
-- This allows users to insert their own profile when they sign up

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow user insert own profile" ON users;
DROP POLICY IF EXISTS "Allow user read own profile" ON users;
DROP POLICY IF EXISTS "Allow user update own profile" ON users;

-- Create policy to allow users to insert their own profile
CREATE POLICY "Allow user insert own profile"
ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create policy to allow users to read their own profile
CREATE POLICY "Allow user read own profile"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow user update own profile"
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Note: Run this SQL in your Supabase SQL Editor