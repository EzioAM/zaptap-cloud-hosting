const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Diagnosing App Linking Setup...\n');

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        return { exists: false, error: 'Table does not exist' };
      }
      return { exists: true, error: error.message };
    }
    
    return { exists: true, error: null, hasData: data && data.length > 0 };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function getTableColumns(tableName) {
  try {
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: tableName
    }).catch(() => null);
    
    // If RPC doesn't exist, try a different approach
    if (!data) {
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (sampleData && sampleData.length > 0) {
        return Object.keys(sampleData[0]);
      }
    }
    
    return data || [];
  } catch (err) {
    return [];
  }
}

async function checkLinkingTables() {
  console.log('📊 Checking Linking Tables:\n');
  
  const tables = ['public_shares', 'shares', 'automations', 'automation_deployments'];
  const results = {};
  
  for (const table of tables) {
    const result = await checkTable(table);
    results[table] = result;
    
    console.log(`Table: ${table}`);
    console.log(`  Exists: ${result.exists ? '✅' : '❌'}`);
    
    if (result.exists) {
      console.log(`  Has Data: ${result.hasData ? '✅' : '⚠️  (empty)'}`);
      
      // Get columns if table exists
      const columns = await getTableColumns(table);
      if (columns.length > 0) {
        console.log(`  Columns: ${columns.join(', ')}`);
      }
    } else {
      console.log(`  Error: ${result.error}`);
    }
    console.log();
  }
  
  return results;
}

async function checkPublicSharesStructure() {
  console.log('🔗 Checking public_shares Structure:\n');
  
  const { data, error } = await supabase
    .from('public_shares')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.log('❌ Could not query public_shares:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Sample share structure:');
    const sample = data[0];
    Object.keys(sample).forEach(key => {
      const value = sample[key];
      const valueType = typeof value;
      console.log(`  ${key}: ${valueType}${value === null ? ' (null)' : ''}`);
    });
    
    console.log(`\n📈 Recent shares: ${data.length}`);
    data.forEach(share => {
      console.log(`  - ID: ${share.id}`);
      console.log(`    Created: ${new Date(share.created_at).toLocaleDateString()}`);
      console.log(`    Expires: ${new Date(share.expires_at).toLocaleDateString()}`);
      console.log(`    Access Count: ${share.access_count || 0}`);
    });
  } else {
    console.log('⚠️  No shares found in public_shares table');
  }
}

async function checkAppConfiguration() {
  console.log('\n📱 App Configuration Check:\n');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check app.config.js
    const appConfigPath = path.join(__dirname, '..', 'app.config.js');
    if (fs.existsSync(appConfigPath)) {
      const appConfig = require(appConfigPath);
      const expoConfig = appConfig.default?.expo || appConfig.expo || {};
      
      console.log('URL Scheme:', expoConfig.scheme || '❌ Not configured');
      console.log('iOS Bundle ID:', expoConfig.ios?.bundleIdentifier || '❌ Not configured');
      console.log('Android Package:', expoConfig.android?.package || '❌ Not configured');
      
      if (expoConfig.ios?.associatedDomains) {
        console.log('Associated Domains:');
        expoConfig.ios.associatedDomains.forEach(domain => {
          console.log(`  - ${domain}`);
        });
      }
      
      if (expoConfig.android?.intentFilters) {
        console.log('Android Intent Filters:', expoConfig.android.intentFilters.length);
      }
    } else {
      console.log('❌ app.config.js not found');
    }
  } catch (err) {
    console.log('⚠️  Could not check app configuration:', err.message);
  }
}

async function checkLinkingService() {
  console.log('\n🔧 LinkingService Check:\n');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const linkingServicePath = path.join(__dirname, '..', 'src', 'services', 'linking', 'LinkingService.ts');
    if (fs.existsSync(linkingServicePath)) {
      const content = fs.readFileSync(linkingServicePath, 'utf8');
      
      // Check for key patterns
      const patterns = {
        'Share generation': /generateShareLink|createShare/,
        'Public shares table': /public_shares/,
        'URL construction': /zaptap:\/\/|https:\/\/.*zaptap/,
        'Supabase client': /supabase\.(from|select|insert)/
      };
      
      Object.entries(patterns).forEach(([name, pattern]) => {
        const found = pattern.test(content);
        console.log(`${name}: ${found ? '✅' : '❌'}`);
      });
      
      // Extract URL patterns
      const urlMatches = content.match(/https?:\/\/[^\s'"]+|zaptap:\/\/[^\s'"]+/g);
      if (urlMatches) {
        console.log('\nURL patterns found:');
        [...new Set(urlMatches)].forEach(url => {
          console.log(`  - ${url}`);
        });
      }
    } else {
      console.log('❌ LinkingService.ts not found');
    }
  } catch (err) {
    console.log('⚠️  Could not check LinkingService:', err.message);
  }
}

async function checkRLSPolicies() {
  console.log('\n🔒 RLS Policies Check:\n');
  
  // Check if public_shares has RLS
  const { data: tables, error } = await supabase.rpc('get_rls_status').catch(() => ({ data: null, error: 'RPC not available' }));
  
  if (!tables) {
    console.log('⚠️  Could not check RLS status (custom RPC not available)');
    console.log('Run this query in Supabase SQL Editor to check:');
    console.log(`
SELECT 
  tablename, 
  rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('public_shares', 'shares', 'automations');
    `);
  } else {
    tables.forEach(table => {
      console.log(`${table.tablename}: RLS ${table.rls_enabled ? '✅ Enabled' : '❌ Disabled'}`);
    });
  }
}

async function generateTestShareLink() {
  console.log('\n🧪 Test Share Link Generation:\n');
  
  try {
    // Try to create a test share
    const testAutomation = {
      id: 'test-' + Date.now(),
      title: 'Test Automation',
      description: 'Diagnostic test',
      steps: [],
      triggers: []
    };
    
    const shareId = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    const { data, error } = await supabase
      .from('public_shares')
      .insert({
        id: shareId,
        automation_id: testAutomation.id,
        automation_data: testAutomation,
        expires_at: expiresAt.toISOString(),
        access_count: 0
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Could not create test share:', error.message);
      console.log('\nPossible issues:');
      console.log('- public_shares table missing');
      console.log('- RLS policies blocking insert');
      console.log('- Required columns missing');
    } else {
      console.log('✅ Test share created successfully!');
      console.log(`Share ID: ${data.id}`);
      console.log(`\nPossible share URLs:`);
      console.log(`- Deep link: zaptap://share/${data.id}`);
      console.log(`- Web link: https://zaptap.cloud/share/${data.id}`);
      console.log(`- Alternative: https://www.zaptap.cloud/s/${data.id}`);
      
      // Clean up test share
      await supabase
        .from('public_shares')
        .delete()
        .eq('id', data.id);
    }
  } catch (err) {
    console.log('❌ Error in test share generation:', err.message);
  }
}

async function generateReport() {
  console.log('\n📋 Diagnostic Summary:\n');
  
  const issues = [];
  const recommendations = [];
  
  // Analyze results and provide recommendations
  const tables = await checkLinkingTables();
  
  if (!tables.public_shares?.exists) {
    issues.push('public_shares table does not exist');
    recommendations.push('Run the sharing migration to create public_shares table');
  }
  
  if (tables.public_shares?.exists && !tables.public_shares?.hasData) {
    issues.push('public_shares table is empty');
    recommendations.push('Test share functionality to ensure it works');
  }
  
  console.log('Issues Found:');
  if (issues.length === 0) {
    console.log('  ✅ No critical issues found');
  } else {
    issues.forEach(issue => console.log(`  ❌ ${issue}`));
  }
  
  console.log('\nRecommendations:');
  if (recommendations.length === 0) {
    console.log('  ✅ Everything looks good!');
  } else {
    recommendations.forEach(rec => console.log(`  → ${rec}`));
  }
}

// Run all diagnostics
async function runDiagnostics() {
  try {
    await checkLinkingTables();
    await checkPublicSharesStructure();
    await checkAppConfiguration();
    await checkLinkingService();
    await checkRLSPolicies();
    await generateTestShareLink();
    await generateReport();
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
  }
}

runDiagnostics();