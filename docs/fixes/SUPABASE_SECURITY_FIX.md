# Supabase Security Fix Guide

This guide helps you fix all security issues reported by Supabase linter.

## Issues to Fix

1. **SECURITY DEFINER View** - `user_roles_summary` view has SECURITY DEFINER property
2. **Missing RLS** - 8 tables don't have Row Level Security enabled:
   - user_collections
   - automation_reviews  
   - feature_flags
   - automation_executions
   - step_executions
   - shares
   - reviews
   - comments

## Quick Fix Steps

### Option 1: Automated (Requires Service Role Key)

```bash
# Run the security fix
npm run fix:security
```

### Option 2: Manual Fix in Supabase Dashboard

1. Go to https://app.supabase.com
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy the entire contents of `supabase/migrations/16_comprehensive_security_fix.sql`
5. Paste into SQL Editor and click **Run**

### Option 3: Quick Copy-Paste Commands

If you prefer to run each fix separately:

#### Fix SECURITY DEFINER View:
```sql
-- Drop and recreate view without SECURITY DEFINER
DROP VIEW IF EXISTS public.user_roles_summary CASCADE;

CREATE VIEW public.user_roles_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    COUNT(DISTINCT a.id) as total_automations,
    COUNT(DISTINCT CASE WHEN a.is_public THEN a.id END) as public_automations
FROM public.users u
LEFT JOIN public.automations a ON a.created_by = u.id
GROUP BY u.id, u.email, u.name, u.role, u.created_at;

GRANT SELECT ON public.user_roles_summary TO authenticated;
```

#### Enable RLS on All Tables:
```sql
-- Enable RLS on all tables at once
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
```

## Verification

After applying fixes:

1. Run verification script:
   ```bash
   npm run verify:security
   ```

2. Or check manually in Supabase:
   - Go to **Database → Tables**
   - Each table should show a shield icon (🛡️) indicating RLS is enabled
   - Go to **Database → Lint** to see if errors are resolved

## What These Fixes Do

### SECURITY DEFINER Fix
- Removes SECURITY DEFINER from the view
- View now runs with querying user's permissions instead of creator's
- Prevents potential privilege escalation

### RLS Policies
Each table gets appropriate policies:

- **user_collections**: Users can only see/modify their own collections
- **automation_reviews**: Anyone can view, authenticated users can create/modify their own
- **feature_flags**: Anyone can view, only admins can modify
- **automation_executions**: Users can only see/modify their own executions
- **step_executions**: Access based on parent execution ownership
- **shares**: Users see shares they created/received or public shares
- **reviews**: Public read, users can modify their own
- **comments**: Public read, users can modify their own

## Troubleshooting

If you get errors:

1. **"permission denied"**: Make sure you're using the service role key
2. **"table does not exist"**: Some tables might not be created yet
3. **"policy already exists"**: The script drops existing policies, but you can run it again

## Important Notes

- Always backup your database before running migrations
- Test in a development environment first
- RLS policies affect API access - test your app after applying
- The migration is wrapped in a transaction - it's all or nothing