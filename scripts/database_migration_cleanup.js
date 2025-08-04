#!/usr/bin/env node

/**
 * Database Migration Cleanup Script
 * 
 * This script helps clean up the conflicting migration files and provides
 * guidance on applying the master consolidation migration.
 * 
 * Usage: node scripts/database_migration_cleanup.js
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// List of conflicting migration files that should be backed up and removed
const CONFLICTING_MIGRATIONS = [
    '00_apply_all_security_fixes.sql',
    '00_comprehensive_security_fix.sql',
    '01_fix_auth_users_exposure.sql',
    '01_fix_auth_users_exposure_dynamic.sql',
    '02_remove_security_definer.sql',
    '03_enable_rls_policies.sql',
    '04_comprehensive_security_fix.sql',
    '04_secure_sensitive_tables.sql',
    '05_comprehensive_security_fix_corrected.sql',
    '06_verify_security_fixes.sql',
    '07_security_fix_actual_schema.sql',
    '08_minimal_security_fix.sql',
    '09_check_and_fix_security.sql',
    '10_dynamic_security_fix.sql',
    '11_fix_app_linking.sql',
    '11_fix_app_linking_safe.sql',
    '12_create_missing_rpc_functions.sql',
    '12_fix_app_linking_safe.sql',
    '13_fix_app_linking_comprehensive.sql',
    '14_fix_app_linking_alternative.sql',
    '15_fix_auth_and_public_automations.sql',
    '16_comprehensive_security_fix.sql',
    '16_comprehensive_security_fix_v2.sql',
    '17_fix_shares_table_policies.sql',
    '18_fix_function_search_paths.sql',
    '19_fix_critical_database_api_issues.sql'
];

// Files to keep
const FILES_TO_KEEP = [
    '03_implement_todo_functions.sql',
    '20240103_add_engagement_tracking.sql',
    '20240103_create_analytics_functions.sql',
    '20240103_create_cleanup_functions.sql',
    '20240103_create_execution_tracking.sql',
    '20_master_consolidation.sql',
    'verify_database_health.sql',
    'README.md',
    'SECURITY_FIX_INSTRUCTIONS.md',
    'check-linking-setup.sql',
    'update_developer_role.sql',
    'update_user_role.sql'
];

function main() {
    console.log('🔧 Database Migration Cleanup Script');
    console.log('=====================================\n');

    // Check if migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.error('❌ Migrations directory not found:', MIGRATIONS_DIR);
        process.exit(1);
    }

    // Read all files in migrations directory
    const allFiles = fs.readdirSync(MIGRATIONS_DIR);
    
    console.log('📁 Found', allFiles.length, 'files in migrations directory\n');

    // Create backup directory
    const backupDir = path.join(MIGRATIONS_DIR, '.backup_' + Date.now());
    console.log('📦 Creating backup directory:', path.basename(backupDir));
    fs.mkdirSync(backupDir, { recursive: true });

    let backedUpCount = 0;
    let errorCount = 0;

    // Process conflicting migrations
    for (const filename of CONFLICTING_MIGRATIONS) {
        const filePath = path.join(MIGRATIONS_DIR, filename);
        
        if (fs.existsSync(filePath)) {
            try {
                // Create backup
                const backupPath = path.join(backupDir, filename);
                fs.copyFileSync(filePath, backupPath);
                
                // Remove original
                fs.unlinkSync(filePath);
                
                console.log('✅ Backed up and removed:', filename);
                backedUpCount++;
            } catch (error) {
                console.error('❌ Error processing', filename, ':', error.message);
                errorCount++;
            }
        }
    }

    console.log('\n📊 Summary:');
    console.log('- Files backed up and removed:', backedUpCount);
    console.log('- Errors encountered:', errorCount);
    console.log('- Backup location:', backupDir);

    // Check for master migration
    const masterMigrationPath = path.join(MIGRATIONS_DIR, '20_master_consolidation.sql');
    const healthCheckPath = path.join(MIGRATIONS_DIR, 'verify_database_health.sql');

    console.log('\n🔍 Checking required files:');
    console.log('- Master migration:', fs.existsSync(masterMigrationPath) ? '✅ Found' : '❌ Missing');
    console.log('- Health check script:', fs.existsSync(healthCheckPath) ? '✅ Found' : '❌ Missing');

    // List remaining files
    const remainingFiles = fs.readdirSync(MIGRATIONS_DIR).filter(f => !f.startsWith('.'));
    console.log('\n📋 Remaining migration files:');
    remainingFiles.forEach(file => {
        const isRequired = FILES_TO_KEEP.includes(file);
        console.log(`  ${isRequired ? '✅' : '❓'} ${file}`);
    });

    console.log('\n🚀 Next Steps:');
    console.log('1. Run the master consolidation migration in Supabase:');
    console.log('   supabase db reset  # Reset to clean state');
    console.log('   # OR manually run: 20_master_consolidation.sql');
    console.log('');
    console.log('2. Verify the database health:');
    console.log('   # Load verification script and run:');
    console.log('   SELECT * FROM comprehensive_database_health_check();');
    console.log('');
    console.log('3. Test API functionality in the app');
    console.log('');
    console.log('⚠️  Important: The master migration supersedes all backed up files.');
    console.log('   Only restore from backup if absolutely necessary.');

    if (errorCount > 0) {
        console.log('\n⚠️  Some errors occurred. Check the error messages above.');
        process.exit(1);
    } else {
        console.log('\n✅ Cleanup completed successfully!');
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };