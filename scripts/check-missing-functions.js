const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 Checking for Missing RPC Functions...\n');

// List of all RPC functions used in the codebase
const rpcFunctions = [
  { name: 'exec_sql', params: ['sql_query'], used_in: ['fix-app-linking.js', 'fix-sharing-database.js', 'apply-sharing-migration.js', 'fix-comments-system.js'] },
  { name: 'execute_sql', params: ['query'], used_in: ['DeveloperService.ts'] },
  { name: 'get_user_automation_stats', params: ['p_user_id'], used_in: ['automationApi.ts'] },
  { name: 'get_automation_engagement', params: ['p_automation_id'], used_in: ['automationApi.ts'] },
  { name: 'get_trending_automations', params: ['p_limit', 'p_offset', 'p_category'], used_in: ['automationApi.ts'] },
  { name: 'track_automation_download', params: ['p_automation_id'], used_in: ['automationApi.ts'] },
  { name: 'track_automation_view', params: ['p_automation_id'], used_in: ['automationApi.ts'] },
  { name: 'increment_automation_execution_count', params: ['automation_id'], used_in: ['AutomationEngineRefactored.ts'] },
  { name: 'increment_share_access_count', params: ['p_share_id'], used_in: ['SharingAnalyticsService.ts'] },
  { name: 'get_table_columns', params: ['table_name', 'schema_name'], used_in: ['diagnose-app-linking.js'] },
  { name: 'get_rls_status', params: [], used_in: ['diagnose-app-linking.js'] },
  { name: 'revert_change', params: ['change_id'], used_in: ['CloudChangeHistoryService.ts'] },
  { name: 'get_change_statistics', params: [], used_in: ['CloudChangeHistoryService.ts'] },
  { name: 'grant_developer_access', params: ['user_email'], used_in: ['setup-supabase-roles.js'] }
];

async function checkFunctionExists(functionName) {
  try {
    // Try to get function info from pg_proc
    const { data, error } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', functionName)
      .single();
    
    return !error && data;
  } catch (err) {
    // If pg_proc is not accessible, try calling the function with dummy params
    try {
      const params = {};
      const { error } = await supabase.rpc(functionName, params);
      // If we get a parameter error, the function exists
      return error && error.message.includes('parameter');
    } catch {
      return false;
    }
  }
}

async function generateMissingFunctionSQL() {
  const missingFunctions = [];
  const existingFunctions = [];
  
  console.log('📋 Checking RPC Functions:\n');
  
  for (const func of rpcFunctions) {
    const exists = await checkFunctionExists(func.name);
    
    if (exists) {
      console.log(`✅ ${func.name} - EXISTS`);
      existingFunctions.push(func);
    } else {
      console.log(`❌ ${func.name} - MISSING (used in: ${func.used_in.join(', ')})`);
      missingFunctions.push(func);
    }
  }
  
  console.log(`\n📊 Summary: ${existingFunctions.length} exist, ${missingFunctions.length} missing\n`);
  
  if (missingFunctions.length === 0) {
    console.log('🎉 All RPC functions exist!');
    return;
  }
  
  // Generate SQL for missing functions
  let sql = `-- Missing RPC Functions Migration
-- Generated on ${new Date().toISOString()}
-- Run this in Supabase SQL Editor to create missing functions

BEGIN;

`;

  // Add specific function implementations
  for (const func of missingFunctions) {
    sql += generateFunctionSQL(func);
    sql += '\n\n';
  }
  
  sql += 'COMMIT;\n';
  
  // Save to file
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '12_create_missing_rpc_functions.sql');
  
  try {
    fs.writeFileSync(migrationPath, sql);
    console.log(`✅ Migration file created: ${migrationPath}`);
    console.log('\n📝 Next steps:');
    console.log('1. Review the generated SQL file');
    console.log('2. Run it in Supabase SQL Editor');
    console.log('3. Re-run your scripts to verify they work');
  } catch (err) {
    console.error('❌ Error saving migration file:', err.message);
    console.log('\n📋 SQL Migration (copy and run in Supabase SQL Editor):');
    console.log(sql);
  }
}

function generateFunctionSQL(func) {
  switch (func.name) {
    case 'exec_sql':
    case 'execute_sql':
      return `-- Function: ${func.name}
-- WARNING: This function allows arbitrary SQL execution. Use with caution!
-- Only grant execute permission to admin/service roles
CREATE OR REPLACE FUNCTION public.${func.name}(${func.name === 'exec_sql' ? 'sql_query' : 'query'} text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Security check: only allow admin users
    IF auth.jwt() ->> 'role' NOT IN ('service_role', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only admin users can execute SQL';
    END IF;
    
    -- Execute the query and return result as JSON
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || ${func.name === 'exec_sql' ? 'sql_query' : 'query'} || ') t' INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        -- Return error as JSON
        RETURN json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

-- Grant execute permission only to service role
GRANT EXECUTE ON FUNCTION public.${func.name}(text) TO service_role;`;

    case 'get_user_automation_stats':
      return `-- Function: get_user_automation_stats
CREATE OR REPLACE FUNCTION public.get_user_automation_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'total_automations', COUNT(DISTINCT a.id),
        'total_executions', COALESCE(SUM(a.execution_count), 0),
        'total_shares', COUNT(DISTINCT s.id),
        'total_downloads', COALESCE(SUM(a.download_count), 0),
        'categories', json_agg(DISTINCT a.category)
    ) INTO stats
    FROM automations a
    LEFT JOIN public_shares s ON s.automation_id = a.id
    WHERE a.created_by = p_user_id;
    
    RETURN COALESCE(stats, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_automation_stats(uuid) TO authenticated;`;

    case 'get_automation_engagement':
      return `-- Function: get_automation_engagement
CREATE OR REPLACE FUNCTION public.get_automation_engagement(p_automation_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    engagement json;
BEGIN
    SELECT json_build_object(
        'view_count', COALESCE(a.view_count, 0),
        'download_count', COALESCE(a.download_count, 0),
        'execution_count', COALESCE(a.execution_count, 0),
        'share_count', COUNT(DISTINCT s.id),
        'average_rating', COALESCE(AVG(r.rating), 0),
        'review_count', COUNT(DISTINCT r.id)
    ) INTO engagement
    FROM automations a
    LEFT JOIN public_shares s ON s.automation_id = a.id
    LEFT JOIN reviews r ON r.automation_id = a.id
    WHERE a.id = p_automation_id
    GROUP BY a.id, a.view_count, a.download_count, a.execution_count;
    
    RETURN COALESCE(engagement, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_automation_engagement(uuid) TO anon, authenticated;`;

    case 'get_trending_automations':
      return `-- Function: get_trending_automations
CREATE OR REPLACE FUNCTION public.get_trending_automations(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_category text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(t))
    INTO result
    FROM (
        SELECT 
            a.*,
            COALESCE(a.view_count, 0) + 
            COALESCE(a.download_count, 0) * 2 + 
            COALESCE(a.execution_count, 0) * 3 as trending_score
        FROM automations a
        WHERE 
            a.is_public = true AND
            (p_category IS NULL OR a.category = p_category)
        ORDER BY trending_score DESC, a.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_automations(integer, integer, text) TO anon, authenticated;`;

    case 'track_automation_download':
      return `-- Function: track_automation_download
CREATE OR REPLACE FUNCTION public.track_automation_download(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE automations
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_automation_download(uuid) TO anon, authenticated;`;

    case 'track_automation_view':
      return `-- Function: track_automation_view
CREATE OR REPLACE FUNCTION public.track_automation_view(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE automations
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_automation_view(uuid) TO anon, authenticated;`;

    case 'increment_automation_execution_count':
      return `-- Function: increment_automation_execution_count
CREATE OR REPLACE FUNCTION public.increment_automation_execution_count(automation_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE automations
    SET execution_count = COALESCE(execution_count, 0) + 1
    WHERE id = automation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_automation_execution_count(uuid) TO anon, authenticated;`;

    case 'increment_share_access_count':
      return `-- Function: increment_share_access_count
CREATE OR REPLACE FUNCTION public.increment_share_access_count(p_share_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public_shares
    SET 
        access_count = COALESCE(access_count, 0) + 1,
        last_accessed_at = now()
    WHERE 
        id = p_share_id AND
        is_active = true AND
        expires_at > now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_share_access_count(text) TO anon, authenticated;`;

    case 'get_table_columns':
      return `-- Function: get_table_columns
CREATE OR REPLACE FUNCTION public.get_table_columns(
    table_name text,
    schema_name text DEFAULT 'public'
)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'column_name', column_name,
            'data_type', data_type,
            'is_nullable', is_nullable,
            'column_default', column_default
        )
    )
    INTO result
    FROM information_schema.columns
    WHERE 
        table_schema = schema_name AND
        information_schema.columns.table_name = get_table_columns.table_name
    ORDER BY ordinal_position;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_columns(text, text) TO authenticated;`;

    case 'get_rls_status':
      return `-- Function: get_rls_status
CREATE OR REPLACE FUNCTION public.get_rls_status()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'table_name', tablename,
            'rls_enabled', rowsecurity
        )
    )
    INTO result
    FROM pg_tables
    WHERE schemaname = 'public';
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rls_status() TO authenticated;`;

    case 'revert_change':
      return `-- Function: revert_change
CREATE OR REPLACE FUNCTION public.revert_change(change_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    change_record record;
    result json;
BEGIN
    -- Get the change record
    SELECT * INTO change_record
    FROM change_history
    WHERE id = change_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Change not found or unauthorized');
    END IF;
    
    -- Apply the previous state
    -- This is a placeholder - actual implementation depends on your change tracking structure
    -- You would need to implement the logic to revert the specific change type
    
    -- Mark change as reverted
    UPDATE change_history
    SET 
        reverted_at = now(),
        reverted_by = auth.uid()
    WHERE id = change_id;
    
    RETURN json_build_object('success', true, 'change_id', change_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_change(uuid) TO authenticated;`;

    case 'get_change_statistics':
      return `-- Function: get_change_statistics
CREATE OR REPLACE FUNCTION public.get_change_statistics()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'total_changes', COUNT(*),
        'changes_by_type', json_object_agg(change_type, type_count),
        'changes_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
        'changes_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
        'reverted_changes', COUNT(*) FILTER (WHERE reverted_at IS NOT NULL)
    )
    INTO stats
    FROM (
        SELECT 
            change_type,
            COUNT(*) as type_count
        FROM change_history
        WHERE user_id = auth.uid()
        GROUP BY change_type
    ) t;
    
    RETURN COALESCE(stats, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_change_statistics() TO authenticated;`;

    case 'grant_developer_access':
      return `-- Function: grant_developer_access
CREATE OR REPLACE FUNCTION public.grant_developer_access(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    result json;
BEGIN
    -- Only allow service role to grant access
    IF auth.jwt() ->> 'role' NOT IN ('service_role', 'supabase_admin') THEN
        RETURN json_build_object('error', 'Unauthorized: Only admin users can grant developer access');
    END IF;
    
    -- Find user by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN json_build_object('error', 'User not found');
    END IF;
    
    -- Update user metadata to include developer role
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        '{"role": "developer"}'::jsonb
    WHERE id = target_user_id;
    
    RETURN json_build_object(
        'success', true,
        'user_id', target_user_id,
        'email', user_email
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_developer_access(text) TO service_role;`;

    default:
      return `-- Function: ${func.name}
-- TODO: Implement this function based on your requirements
CREATE OR REPLACE FUNCTION public.${func.name}(${func.params.map(p => `${p} text`).join(', ')})
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
    -- Placeholder implementation
    RETURN json_build_object('error', 'Function not implemented');
END;
$$;

GRANT EXECUTE ON FUNCTION public.${func.name}(${func.params.map(() => 'text').join(', ')}) TO authenticated;`;
  }
}

// Run the check
generateMissingFunctionSQL().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});