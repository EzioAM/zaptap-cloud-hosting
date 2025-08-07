#!/bin/bash

# Fix iOS Build Environment Script
# This script fixes common iOS build issues including CocoaPods and encoding problems

echo "🔧 Fixing iOS build environment..."

# Set UTF-8 encoding
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export LC_CTYPE=en_US.UTF-8

echo "✅ UTF-8 encoding set"

# Clear all caches
echo "🧹 Clearing caches..."
rm -rf ~/Library/Caches/CocoaPods
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ios/Pods
rm -f ios/Podfile.lock
rm -rf ios/build

echo "✅ Caches cleared"

# Try to run pod install with proper encoding
echo "📦 Installing CocoaPods dependencies..."
cd ios

# Set encoding for Ruby specifically
export RUBYOPT="-EUTF-8"

# Try pod install with explicit UTF-8
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install --repo-update

if [ $? -eq 0 ]; then
    echo "✅ CocoaPods installation successful!"
else
    echo "❌ CocoaPods installation failed. Trying alternative method..."
    
    # Alternative: Use bundler if available
    if [ -f "Gemfile" ]; then
        echo "Using bundler..."
        bundle install
        bundle exec pod install --repo-update
    else
        echo "Creating Gemfile for bundler approach..."
        cat > Gemfile <<EOF
source "https://rubygems.org"
gem "cocoapods", "~> 1.15"
EOF
        bundle install
        bundle exec pod install --repo-update
    fi
fi

cd ..
echo "✅ iOS build environment fixed!"