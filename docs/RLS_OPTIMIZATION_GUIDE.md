# Supabase RLS Performance Optimization Guide

## Overview
This document outlines the RLS performance optimizations applied to the ShortcutsLike database and provides best practices for maintaining optimal performance.

## Problems Addressed

### 1. Auth RLS Initialization Plan Issue
**Problem:** Using `auth.uid()` directly in policies causes the function to be re-evaluated for each row.

**Solution:** Wrap auth functions with `(select auth.uid())` to ensure single evaluation per query.

```sql
-- Before (inefficient)
CREATE POLICY "example" ON table
  FOR SELECT USING (user_id = auth.uid());

-- After (optimized)
CREATE POLICY "example" ON table
  FOR SELECT USING (user_id = (select auth.uid()));
```

### 2. Multiple Permissive Policies
**Problem:** Having multiple permissive policies for the same operation causes Postgres to evaluate all of them.

**Solution:** Consolidate multiple policies into single policies with OR conditions.

```sql
-- Before (multiple policies)
CREATE POLICY "policy1" FOR SELECT USING (condition1);
CREATE POLICY "policy2" FOR SELECT USING (condition2);

-- After (consolidated)
CREATE POLICY "combined" FOR SELECT USING (condition1 OR condition2);
```

## Migration Files

1. **Main Migration:** `/supabase/migrations/20240108_fix_rls_performance.sql`
   - Fixes auth function calls
   - Consolidates duplicate policies
   - Adds performance indexes

2. **Verification Script:** `/supabase/scripts/verify_rls_optimization.sql`
   - Checks for remaining unoptimized policies
   - Identifies duplicate policies
   - Verifies indexes

3. **Performance Monitor:** `/supabase/scripts/monitor_rls_performance.sql`
   - Tracks query performance metrics
   - Compares before/after results

4. **Rollback Script:** `/supabase/scripts/rollback_rls_optimization.sql`
   - Emergency rollback if issues arise

## Best Practices Going Forward

### 1. Writing New Policies

Always use the optimized pattern:
```sql
-- ✅ Good: Single evaluation
CREATE POLICY "name" ON table
  FOR SELECT USING (user_id = (select auth.uid()));

-- ❌ Bad: Re-evaluated for each row
CREATE POLICY "name" ON table
  FOR SELECT USING (user_id = auth.uid());
```

### 2. Complex Conditions

Combine conditions in a single policy:
```sql
-- ✅ Good: Single policy
CREATE POLICY "combined_access" ON table
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    is_public = true OR
    EXISTS (
      SELECT 1 FROM shared_access
      WHERE shared_access.resource_id = table.id
      AND shared_access.user_id = (select auth.uid())
    )
  );

-- ❌ Bad: Multiple policies
CREATE POLICY "own_access" FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "public_access" FOR SELECT USING (is_public = true);
CREATE POLICY "shared_access" FOR SELECT USING (...);
```

### 3. Index Foreign Keys

Always create indexes for columns used in RLS policies:
```sql
CREATE INDEX idx_table_user_id ON table(user_id);
CREATE INDEX idx_table_is_public ON table(is_public) WHERE is_public = true;
```

### 4. Testing New Policies

Before deploying new policies:
1. Test with EXPLAIN ANALYZE
2. Check execution time with sample data
3. Verify no auth function re-evaluation

```sql
-- Test query plan
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM your_table WHERE <your conditions>;
```

## Performance Monitoring

### Regular Checks
Run these queries monthly to ensure continued optimization:

```sql
-- Check for unoptimized auth functions
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%auth.uid()%'
  AND qual NOT LIKE '%(select auth.uid())%';

-- Check for duplicate policies
WITH duplicates AS (
  SELECT tablename, cmd, COUNT(*) as count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename, cmd
  HAVING COUNT(*) > 1
)
SELECT * FROM duplicates;
```

### Key Metrics to Track
- Query execution time
- Number of sequential scans
- Index usage statistics
- Policy evaluation overhead

## Common Pitfalls to Avoid

1. **Don't create overlapping permissive policies** - They all get evaluated
2. **Don't forget indexes** - RLS queries need proper indexing
3. **Don't use functions in WHERE clauses** - Use computed columns instead
4. **Don't ignore EXPLAIN ANALYZE** - Always verify query plans

## Troubleshooting

### Slow Queries After Migration
1. Run the verification script
2. Check for missing indexes
3. Analyze query plans with EXPLAIN
4. Consider table statistics: `ANALYZE table_name;`

### Policy Not Working as Expected
1. Check policy syntax with verification script
2. Test with a specific user context
3. Verify auth function is wrapped properly
4. Check for conflicting policies

## Additional Resources

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Query Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)

## Contact

For questions or issues related to these optimizations, contact the development team or create an issue in the project repository.