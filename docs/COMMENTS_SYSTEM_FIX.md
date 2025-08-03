# Comments System Fix Guide

## Issue
The comments and feedback system is not posting comments when users tap "Post".

## Root Cause
The `automation_comments` and `comment_likes` tables are likely missing from your Supabase database, or the Row Level Security (RLS) policies are not configured correctly.

## Solution

### Method 1: Quick Fix (Recommended)
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the entire contents of `fix-comments-database.sql`
4. Click "Run" to execute the SQL
5. You should see "Comments system setup complete!" at the bottom

### Method 2: Using the Fix Script
```bash
# From the project root directory
node scripts/fix-comments-system.js
```

This script will check your database and provide specific instructions if manual setup is needed.

## What This Fix Does

1. **Creates Required Tables**:
   - `automation_comments` - Stores all comments
   - `comment_likes` - Tracks likes on comments

2. **Sets Up Security**:
   - Enables Row Level Security (RLS)
   - Creates policies to control who can read/write comments
   - Only allows comments on public automations

3. **Adds Performance Indexes**:
   - Indexes for faster comment queries
   - Automatic like count updates via triggers

## Verification

After running the fix:
1. Make sure you're logged in to the app
2. Navigate to a **public** automation (important!)
3. Open Comments & Feedback
4. Try posting a comment

## Common Issues

### "Table does not exist" error
- Run the SQL fix script in Supabase

### "Not authenticated" error
- Make sure you're logged in

### "Comments are only allowed on public automations"
- The automation must have `is_public = true`
- Check automation settings or publish it to gallery

### "Permission denied" error
- RLS policies may need updating
- Re-run the fix script

## Database Structure

The comments system uses these tables:
```sql
automation_comments
├── id (UUID, primary key)
├── automation_id (references automations)
├── parent_comment_id (for replies)
├── user_id (comment author)
├── content (comment text)
├── is_edited (boolean)
├── is_pinned (boolean)
├── likes_count (integer)
├── created_at (timestamp)
└── updated_at (timestamp)

comment_likes
├── id (UUID, primary key)
├── comment_id (references automation_comments)
├── user_id (who liked)
└── created_at (timestamp)
```

## Features Supported
- ✅ Post comments on public automations
- ✅ Reply to comments (nested)
- ✅ Like/unlike comments
- ✅ Edit own comments
- ✅ Delete own comments
- ✅ Pin comments (automation owner only)
- ✅ Real-time like counts
- ✅ Comment analytics