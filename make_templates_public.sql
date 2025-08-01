-- Make template automations public so they can be accessed via NFC by anyone

-- Update existing test automations to be public
UPDATE automations 
SET is_public = true, updated_at = NOW()
WHERE category IN ('test', 'template') OR tags && ARRAY['test', 'template'];

-- Also update any automations that are from templates (commonly used categories)
UPDATE automations 
SET is_public = true, updated_at = NOW()
WHERE category IN ('productivity', 'essentials', 'emergency', 'communication') 
AND title LIKE '%Template%';

-- Verify the changes
SELECT id, title, is_public, category, tags 
FROM automations 
WHERE is_public = true;

-- Note: Run this SQL in your Supabase SQL Editor to make template automations accessible