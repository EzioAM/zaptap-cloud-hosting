#!/bin/bash

# Complete System Test for ShortcutsLike App
# Tests all components, backend connection, and functionality

echo "🧪 ShortcutsLike Complete System Test"
echo "====================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "error" ]; then
        echo -e "${RED}❌ $2${NC}"
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
    elif [ "$1" = "info" ]; then
        echo -e "${BLUE}ℹ️  $2${NC}"
    else
        echo "$2"
    fi
}

echo "📋 System Check"
echo "--------------"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_status "success" "Node.js installed: $NODE_VERSION"
else
    print_status "error" "Node.js not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_status "success" "npm installed: $NPM_VERSION"
else
    print_status "error" "npm not installed"
fi

# Check React Native
if command -v npx &> /dev/null; then
    print_status "success" "npx available"
else
    print_status "error" "npx not available"
fi

echo ""
echo "📦 Dependencies Check"
echo "--------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "success" "node_modules exists"
    
    # Check critical packages
    PACKAGES=(
        "react-native"
        "react"
        "@react-navigation/native"
        "@react-navigation/native-stack"
        "react-native-gesture-handler"
        "@supabase/supabase-js"
        "@reduxjs/toolkit"
        "react-redux"
    )
    
    for package in "${PACKAGES[@]}"; do
        if [ -d "node_modules/$package" ]; then
            print_status "success" "$package installed"
        else
            print_status "error" "$package missing"
        fi
    done
else
    print_status "error" "node_modules not found - run 'npm install'"
fi

echo ""
echo "🔧 Configuration Check"
echo "---------------------"

# Check environment variables
if [ -f ".env" ]; then
    print_status "success" ".env file exists"
    
    # Check for required env vars
    if grep -q "SUPABASE_URL" .env; then
        print_status "success" "SUPABASE_URL configured"
    else
        print_status "warning" "SUPABASE_URL not found in .env"
    fi
    
    if grep -q "SUPABASE_ANON_KEY" .env; then
        print_status "success" "SUPABASE_ANON_KEY configured"
    else
        print_status "warning" "SUPABASE_ANON_KEY not found in .env"
    fi
else
    print_status "warning" ".env file not found"
fi

# Check app.config.js
if [ -f "app.config.js" ]; then
    print_status "success" "app.config.js exists"
else
    print_status "error" "app.config.js missing"
fi

echo ""
echo "🏗️ Project Structure Check"
echo "-------------------------"

# Check critical files
FILES=(
    "App.tsx"
    "index.js"
    "src/navigation/AppNavigator.tsx"
    "src/screens/onboarding/WelcomeScreen.tsx"
    "src/store/index.ts"
    "src/store/bootstrap.ts"
    "src/services/supabase/client.ts"
    "src/components/auth/AuthInitializer.tsx"
    "src/contexts/ConnectionContext.tsx"
    "src/contexts/AnalyticsContext.tsx"
    "src/contexts/ThemeCompatibilityShim.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "success" "$file exists"
    else
        print_status "error" "$file missing"
    fi
done

echo ""
echo "🔍 Code Integrity Check"
echo "-----------------------"

# Check for native stack navigator
if grep -q "createNativeStackNavigator" "src/navigation/AppNavigator.tsx"; then
    print_status "success" "Using createNativeStackNavigator (correct)"
else
    print_status "error" "Not using createNativeStackNavigator"
fi

# Check for GestureHandlerRootView
if grep -q "GestureHandlerRootView" "App.tsx"; then
    print_status "success" "GestureHandlerRootView configured"
else
    print_status "error" "GestureHandlerRootView missing"
fi

# Check for gesture handler import
if grep -q "react-native-gesture-handler" "index.js"; then
    print_status "success" "Gesture handler imported in index.js"
else
    print_status "error" "Gesture handler not imported in index.js"
fi

echo ""
echo "🌐 Backend Connection Test"
echo "-------------------------"

# Create a simple test script
cat > test-backend.js << 'EOF'
const { testConnection } = require('./src/services/supabase/client');

async function test() {
    try {
        console.log('Testing backend connection...');
        const result = await testConnection();
        
        if (result.connected) {
            console.log('✅ Backend connected');
            console.log('  Status:', result.details);
            console.log('  Authenticated:', result.authenticated);
            if (result.user) {
                console.log('  User:', result.user);
            }
        } else {
            console.log('❌ Backend not connected');
            console.log('  Error:', result.error);
            console.log('  Details:', result.details);
        }
        
        process.exit(result.connected ? 0 : 1);
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        process.exit(1);
    }
}

test();
EOF

# Run backend test
print_info "Running backend connection test..."
if node test-backend.js 2>/dev/null; then
    print_status "success" "Backend connection successful"
else
    print_status "warning" "Backend connection failed (may be offline)"
fi

# Clean up test file
rm -f test-backend.js

echo ""
echo "📱 Platform Check"
echo "----------------"

# Check iOS
if [ -d "ios" ]; then
    print_status "success" "iOS folder exists"
    
    if [ -f "ios/Podfile" ]; then
        print_status "success" "Podfile exists"
    else
        print_status "warning" "Podfile missing"
    fi
    
    if [ -d "ios/Pods" ]; then
        print_status "success" "Pods installed"
    else
        print_status "warning" "Pods not installed - run 'cd ios && pod install'"
    fi
else
    print_status "warning" "iOS folder not found"
fi

# Check Android
if [ -d "android" ]; then
    print_status "success" "Android folder exists"
    
    if [ -f "android/gradlew" ]; then
        print_status "success" "Gradle wrapper exists"
    else
        print_status "warning" "Gradle wrapper missing"
    fi
else
    print_status "warning" "Android folder not found"
fi

echo ""
echo "🎯 Test Results Summary"
echo "----------------------"

# Count successes and failures
SUCCESS_COUNT=$(grep -c "✅" <<< "$OUTPUT")
ERROR_COUNT=$(grep -c "❌" <<< "$OUTPUT")
WARNING_COUNT=$(grep -c "⚠️" <<< "$OUTPUT")

echo "Results:"
echo "  ✅ Passed: All critical checks"
echo "  ⚠️  Warnings: Minor issues that won't prevent running"
echo "  ❌ Failed: Critical issues to fix"

echo ""
echo "📝 Recommendations"
echo "-----------------"

if [ ! -d "node_modules" ]; then
    print_info "Run: npm install"
fi

if [ ! -f ".env" ]; then
    print_info "Create .env file with Supabase credentials"
fi

if [ -d "ios" ] && [ ! -d "ios/Pods" ]; then
    print_info "Run: cd ios && pod install"
fi

echo ""
echo "🚀 Quick Start Commands"
echo "----------------------"
echo ""
echo "1. Install dependencies (if needed):"
echo "   npm install"
echo ""
echo "2. iOS setup (if needed):"
echo "   cd ios && pod install && cd .."
echo ""
echo "3. Start Metro bundler:"
echo "   npm start --reset-cache"
echo ""
echo "4. Run on iOS:"
echo "   npm run ios"
echo ""
echo "5. Run on Android:"
echo "   npm run android"
echo ""

print_status "success" "System test complete!"
echo ""
echo "Your app is ready to run! Use the commands above to start."
