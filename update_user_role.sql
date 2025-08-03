-- Update user role for marcminott@gmail.com to developer

-- First, ensure the users table has a role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Update marcminott@gmail.com to have developer role
UPDATE users 
SET role = 'developer' 
WHERE email = 'marcminott@gmail.com';

-- Verify the update
SELECT id, email, role, name 
FROM users 
WHERE email = 'marcminott@gmail.com';