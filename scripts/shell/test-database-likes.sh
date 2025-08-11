#!/bin/bash

# Database Likes Functionality Test Runner
# This script verifies the database setup for likes functionality

set -e

echo "🚀 Starting Database Likes Functionality Tests..."
echo "================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create one with SUPABASE_URL and SUPABASE_ANON_KEY"
    exit 1
fi

# Check if required environment variables are set
source .env
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file"
    exit 1
fi

echo "✅ Environment variables found"
echo "📂 Supabase URL: ${SUPABASE_URL}"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if @supabase/supabase-js is installed
if ! node -e "require('@supabase/supabase-js')" 2>/dev/null; then
    echo "📦 Installing Supabase client..."
    npm install @supabase/supabase-js
fi

# Run the database test script
echo ""
echo "🧪 Running Database Tests..."
echo "============================="
node scripts/test-likes-database.js

# Check the exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS: All database tests passed!"
    echo ""
    echo "📋 Next Steps:"
    echo "- The likes functionality should work correctly in DiscoverScreen"
    echo "- If you're still seeing ConditionError, check the app logs for more details"
    echo "- Consider running the SQL verification script in Supabase SQL Editor:"
    echo "  scripts/sql/verify_likes_database.sql"
else
    echo ""
    echo "❌ FAILURE: Some database tests failed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Run the database setup SQL in Supabase SQL Editor:"
    echo "   - scripts/sql/verify_likes_database.sql"
    echo "   - create_advanced_features_tables.sql (if automation_likes table missing)"
    echo ""
    echo "2. Check Supabase dashboard for any RLS policy issues"
    echo ""
    echo "3. Verify your .env file has correct Supabase credentials"
    echo ""
    echo "4. Check the ConditionError details in your app logs"
    
    exit 1
fi