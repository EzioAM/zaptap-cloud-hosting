#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class SupabaseRoleSetup {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async setupRoles() {
    console.log('🔧 Setting up Supabase user roles and permissions...');

    try {
      // Read the SQL setup file
      const sqlFile = path.join(__dirname, '..', 'docs', 'database', 'supabase_user_roles_setup.sql');
      if (!fs.existsSync(sqlFile)) {
        throw new Error('SQL setup file not found. Please ensure docs/database/supabase_user_roles_setup.sql exists.');
      }

      console.log('📄 SQL setup file found');
      console.log('⚠️  Please run the SQL setup file manually in your Supabase SQL Editor:');
      console.log(`   File: ${sqlFile}`);
      console.log('   URL: https://supabase.com/dashboard/project/[your-project]/sql');
      
      // Test connection
      await this.testConnection();
      
      // Check if roles are set up
      await this.verifySetup();

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  async testConnection() {
    console.log('🔌 Testing Supabase connection...');
    
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count(*)')
        .limit(1);

      if (error) {
        if (error.message.includes('relation "public.profiles" does not exist')) {
          console.log('⚠️  Profiles table does not exist yet. This is normal for a new setup.');
          return;
        }
        throw error;
      }

      console.log('✅ Supabase connection successful');
    } catch (error) {
      console.error('❌ Supabase connection failed:', error.message);
      throw error;
    }
  }

  async verifySetup() {
    console.log('🔍 Verifying role setup...');

    try {
      // Try to get current user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('⚠️  No authenticated user. Please sign in to verify roles.');
        return;
      }

      console.log(`👤 Current user: ${user.email}`);

      // Check if user has developer role
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        if (profileError.message.includes('relation "public.profiles" does not exist')) {
          console.log('⚠️  Profiles table not found. Please run the SQL setup first.');
          return;
        }
        throw profileError;
      }

      if (profile) {
        console.log('✅ User profile found:');
        console.log(`   Role: ${profile.role}`);
        console.log(`   Permissions: ${profile.permissions?.join(', ') || 'none'}`);
        console.log(`   Developer Access: ${profile.is_developer ? 'Yes' : 'No'}`);
      } else {
        console.log('⚠️  User profile not found. This may be normal if the trigger hasn\'t run yet.');
      }

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  }

  async grantDeveloperAccess(email) {
    console.log(`🔧 Granting developer access to: ${email}`);

    try {
      // This would typically be done by a super admin
      const { data, error } = await this.supabase.rpc('grant_developer_access', {
        user_email: email
      });

      if (error) {
        throw error;
      }

      console.log('✅ Developer access granted successfully');
    } catch (error) {
      console.error('❌ Failed to grant developer access:', error.message);
      console.log('💡 Try running the SQL setup file manually in Supabase');
    }
  }

  async listDeveloperUsers() {
    console.log('👥 Listing users with developer access...');

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('email, role, permissions, is_developer, developer_access_granted_at')
        .eq('is_developer', true);

      if (error) throw error;

      if (data && data.length > 0) {
        console.log('✅ Developer users:');
        data.forEach(user => {
          console.log(`   📧 ${user.email}`);
          console.log(`      Role: ${user.role}`);
          console.log(`      Permissions: ${user.permissions?.join(', ') || 'none'}`);
          console.log(`      Granted: ${user.developer_access_granted_at || 'Unknown'}`);
          console.log('');
        });
      } else {
        console.log('⚠️  No developer users found');
      }
    } catch (error) {
      console.error('❌ Failed to list developer users:', error.message);
    }
  }

  async createDeveloperAccessFunction() {
    console.log('🔧 Creating developer access management functions...');

    const functions = [
      {
        name: 'grant_developer_access',
        sql: `
CREATE OR REPLACE FUNCTION public.grant_developer_access(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Check if current user has permission to grant access
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'developer') THEN
    RAISE EXCEPTION 'Insufficient permissions to grant developer access';
  END IF;
  
  -- Find the target user
  SELECT au.id INTO target_user_id
  FROM auth.users au
  WHERE au.email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Grant developer access
  UPDATE public.profiles
  SET 
    role = 'developer',
    permissions = ARRAY['access_developer_tools', 'view_analytics', 'export_data'],
    is_developer = TRUE,
    developer_access_granted_at = NOW(),
    developer_access_granted_by = auth.uid()
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },
      {
        name: 'revoke_developer_access',
        sql: `
CREATE OR REPLACE FUNCTION public.revoke_developer_access(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Check if current user has permission to revoke access
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admin can revoke developer access';
  END IF;
  
  -- Find the target user
  SELECT au.id INTO target_user_id
  FROM auth.users au
  WHERE au.email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Revoke developer access
  UPDATE public.profiles
  SET 
    role = 'user',
    permissions = ARRAY[]::TEXT[],
    is_developer = FALSE
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      }
    ];

    console.log('⚠️  Please run these functions manually in your Supabase SQL Editor:');
    functions.forEach(func => {
      console.log(`\n-- ${func.name.toUpperCase()}`);
      console.log(func.sql);
    });
  }
}

// CLI Usage
async function main() {
  const setup = new SupabaseRoleSetup();
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'setup':
        await setup.setupRoles();
        break;
      case 'verify':
        await setup.testConnection();
        await setup.verifySetup();
        break;
      case 'grant':
        if (!arg) {
          console.log('Usage: npm run supabase:grant <email>');
          process.exit(1);
        }
        await setup.grantDeveloperAccess(arg);
        break;
      case 'list':
        await setup.listDeveloperUsers();
        break;
      case 'functions':
        await setup.createDeveloperAccessFunction();
        break;
      default:
        console.log('Supabase Role Management');
        console.log('');
        console.log('Commands:');
        console.log('  setup     - Set up role system (requires manual SQL execution)');
        console.log('  verify    - Verify current setup and user roles');
        console.log('  grant     - Grant developer access to user email');
        console.log('  list      - List all developer users');
        console.log('  functions - Display SQL functions for manual setup');
        console.log('');
        console.log('Examples:');
        console.log('  npm run supabase:setup');
        console.log('  npm run supabase:verify');
        console.log('  npm run supabase:grant user@example.com');
        console.log('  npm run supabase:list');
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SupabaseRoleSetup;