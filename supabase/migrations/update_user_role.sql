-- Update marcminott@gmail.com to have developer role
UPDATE public.users
SET role = 'developer'
WHERE email = 'marcminott@gmail.com';

-- Verify the update
SELECT id, email, name, role, created_at
FROM public.users
WHERE email = 'marcminott@gmail.com';