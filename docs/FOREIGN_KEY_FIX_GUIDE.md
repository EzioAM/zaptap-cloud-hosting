# Foreign Key Constraint Fix Guide

## The Problem

You're getting this error:
```
ERROR: 23503: insert or update on table "public_shares" violates foreign key constraint "public_shares_automation_id_fkey"
DETAIL: Key (automation_id)=(11111111-1111-1111-1111-111111111111) is not present in table "automations".
```

This happens because:
- `public_shares.automation_id` has a foreign key constraint
- It requires that any `automation_id` must exist in `automations.id`
- The test data tried to use a hard-coded UUID that doesn't exist

## Solutions (In Order of Preference)

### Solution 1: Use the Comprehensive Migration
**File**: `13_fix_app_linking_comprehensive.sql`

This migration:
- Checks if automations exist
- Creates a test automation if needed
- Uses dynamic SQL to handle unknown column requirements
- Creates the test share with a valid automation_id

```sql
-- Run in Supabase SQL Editor:
-- supabase/migrations/13_fix_app_linking_comprehensive.sql
```

### Solution 2: Check Your Schema First
**File**: `check-linking-setup.sql`

Before creating test data, understand your schema:
```sql
-- 1. Check automations table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'automations';

-- 2. Check if any automations exist
SELECT COUNT(*) FROM public.automations;

-- 3. Find a valid automation_id to use
SELECT id, title FROM public.automations LIMIT 5;
```

### Solution 3: Manual Test Data Creation
If the automated solutions fail, create test data manually:

```sql
-- Step 1: Create a minimal automation
INSERT INTO public.automations (
    id,
    title,
    description,
    is_public,
    created_at,
    updated_at
    -- Add other required columns from schema check
) VALUES (
    gen_random_uuid(),
    'Test Automation for Shares',
    'Used for testing share functionality',
    true,
    now(),
    now()
);

-- Step 2: Get the automation ID
SELECT id FROM public.automations 
WHERE title = 'Test Automation for Shares';

-- Step 3: Create share with that ID
INSERT INTO public.public_shares (
    id,
    automation_id, -- Use the ID from step 2
    automation_data,
    expires_at,
    access_count,
    is_active,
    metadata
) VALUES (
    'testshare123',
    'YOUR-AUTOMATION-ID-HERE', -- Replace with actual ID
    '{"title": "Test Share"}'::jsonb,
    now() + INTERVAL '30 days',
    0,
    true,
    '{}'::jsonb
);
```

### Solution 4: Alternative Approaches
**File**: `14_fix_app_linking_alternative.sql`

Contains several options:
- Temporarily disable the foreign key constraint
- Find existing automations to use
- Create minimal automations
- Diagnostic queries

## Quick Diagnosis Commands

```sql
-- 1. Verify the constraint exists
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE constraint_name = 'public_shares_automation_id_fkey';

-- 2. Check for orphaned shares
SELECT COUNT(*) as orphaned_shares
FROM public.public_shares ps
LEFT JOIN public.automations a ON ps.automation_id = a.id
WHERE a.id IS NULL;

-- 3. Find a safe automation to use for testing
SELECT id, title, created_at
FROM public.automations
WHERE is_public = true
ORDER BY created_at DESC
LIMIT 1;
```

## Common Issues and Fixes

### Issue: "Could not create test automation"
**Cause**: Unknown required columns in automations table
**Fix**: Run the schema check query first, then add all required columns

### Issue: "row-level security policy violation"
**Cause**: RLS policies on automations table
**Fix**: Use service role key or temporarily disable RLS

### Issue: "duplicate key value violates unique constraint"
**Cause**: Trying to insert with an ID that already exists
**Fix**: Use `ON CONFLICT (id) DO NOTHING` or generate new IDs

## Best Practices

1. **Always check schema first** - Don't assume column structure
2. **Use existing data when possible** - Find existing automations instead of creating new ones
3. **Handle RLS properly** - Use service role for admin operations
4. **Test incrementally** - Create automation first, verify it exists, then create share
5. **Keep foreign keys** - Don't permanently remove constraints; they ensure data integrity

## Testing Your Fix

After applying any solution:

```sql
-- 1. Verify test automation exists
SELECT * FROM public.automations WHERE title LIKE '%Test%';

-- 2. Verify test share exists
SELECT * FROM public.public_shares WHERE id LIKE 'testshare%';

-- 3. Test the share function
SELECT get_public_share('YOUR-TEST-SHARE-ID');

-- 4. Verify no orphaned shares
SELECT ps.id, ps.automation_id, a.id IS NOT NULL as valid
FROM public.public_shares ps
LEFT JOIN public.automations a ON ps.automation_id = a.id;
```