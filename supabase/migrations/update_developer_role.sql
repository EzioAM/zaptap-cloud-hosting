-- Update marcminott@gmail.com user role to developer
UPDATE public.users
SET role = 'developer'
WHERE email = 'marcminott@gmail.com';

-- Verify the update
DO $$
DECLARE
    updated_role text;
BEGIN
    SELECT role INTO updated_role
    FROM public.users
    WHERE email = 'marcminott@gmail.com';
    
    IF updated_role = 'developer' THEN
        RAISE NOTICE 'Successfully updated role for marcminott@gmail.com to developer';
    ELSE
        RAISE WARNING 'Failed to update role for marcminott@gmail.com. Current role: %', updated_role;
    END IF;
END $$;