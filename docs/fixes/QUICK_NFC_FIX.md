# Quick NFC Tag Fix Guide

## The Problem
Your NFC tag contains an old template ID: `automation_1754027503060_fn81a8hdq`
Your database uses proper UUIDs like: `6c2a305f-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Solution Options

### Option 1: Rewrite NFC Tag from App (EASIEST)
1. Open Zaptap app
2. Go to "My Automations" 
3. Find "Morning Routine (from template)"
4. Tap it → Look for NFC Write button
5. Hold NFC tag near phone to rewrite

### Option 2: Manual URL Creation
If you get the correct UUID from the debug alert, create this URL:
```
https://zaptap.cloud/automation/[PASTE_REAL_UUID_HERE]
```

Then write this URL to your NFC tag using any NFC writing app.

### Option 3: Test with Different Automation
Try writing one of your other "My Automation" entries - they have proper UUIDs.

## After Fix
When you scan the updated NFC tag, you should see:
- ✅ A proper UUID in the debug alert
- ✅ "Success!" message with automation details
- ✅ The automation actually runs

## Enhanced Debug Info
The latest update shows full automation IDs and has a "Copy Morning Routine ID" button to help you get the correct UUID.