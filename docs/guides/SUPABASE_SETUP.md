# Supabase Setup Guide for ShortcutsLike

## Prerequisites
- Supabase account at https://supabase.com
- Project created in Supabase dashboard

## Environment Variables
Ensure your `.env` file contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

## Required Database Tables

### 1. Users Table (automatically created by Supabase Auth)
The `auth.users` table is created automatically when you enable authentication.

### 2. Public Users Profile Table
```sql
-- Create users profile table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 3. Automations Table
```sql
-- Create automations table
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  triggers JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  execution_count INTEGER DEFAULT 0,
  average_rating DECIMAL(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX idx_automations_created_by ON public.automations(created_by);
CREATE INDEX idx_automations_is_public ON public.automations(is_public);
CREATE INDEX idx_automations_category ON public.automations(category);

-- Enable RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- Users can view their own automations
CREATE POLICY "Users can view own automations" ON public.automations
  FOR SELECT USING (auth.uid() = created_by);

-- Users can view public automations
CREATE POLICY "Anyone can view public automations" ON public.automations
  FOR SELECT USING (is_public = true);

-- Users can create automations
CREATE POLICY "Users can create automations" ON public.automations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own automations
CREATE POLICY "Users can update own automations" ON public.automations
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own automations
CREATE POLICY "Users can delete own automations" ON public.automations
  FOR DELETE USING (auth.uid() = created_by);
```

### 4. Categories Table
```sql
-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0
);

-- Insert default categories
INSERT INTO public.categories (id, name, icon, description, color, display_order) VALUES
  ('essentials', 'Essentials', 'star', 'Must-have automations for everyone', '#6200ee', 1),
  ('productivity', 'Productivity', 'briefcase', 'Get more done with less effort', '#03dac6', 2),
  ('morning-routine', 'Morning Routine', 'weather-sunny', 'Start your day right', '#ff6b00', 3),
  ('travel', 'Travel', 'airplane', 'Automations for travelers', '#e91e63', 4),
  ('emergency', 'Emergency', 'alert-circle', 'Safety and emergency automations', '#f44336', 5),
  ('home', 'Home', 'home', 'Smart home automations', '#4caf50', 6),
  ('social', 'Social', 'account-group', 'Social media and communication', '#2196f3', 7),
  ('health', 'Health', 'heart', 'Health and wellness tracking', '#ff9800', 8),
  ('entertainment', 'Entertainment', 'movie', 'Fun and entertainment', '#9c27b0', 9),
  ('general', 'General', 'apps', 'General purpose automations', '#757575', 10);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);
```

### 5. Automation Reviews Table
```sql
-- Create automation reviews table
CREATE TABLE IF NOT EXISTS public.automation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  helpful_count INTEGER DEFAULT 0,
  reported BOOLEAN DEFAULT false,
  UNIQUE(automation_id, user_id)
);

-- Create indexes
CREATE INDEX idx_reviews_automation_id ON public.automation_reviews(automation_id);
CREATE INDEX idx_reviews_user_id ON public.automation_reviews(user_id);

-- Enable RLS
ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews for public automations
CREATE POLICY "View reviews for public automations" ON public.automation_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE id = automation_reviews.automation_id 
      AND is_public = true
    )
  );

-- Users can create reviews for public automations
CREATE POLICY "Users can create reviews" ON public.automation_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE id = automation_reviews.automation_id 
      AND is_public = true
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON public.automation_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON public.automation_reviews
  FOR DELETE USING (auth.uid() = user_id);
```

### 6. Functions and Triggers

```sql
-- Function to update automation ratings
CREATE OR REPLACE FUNCTION update_automation_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.automations
  SET 
    average_rating = (
      SELECT AVG(rating)::DECIMAL(2,1) 
      FROM public.automation_reviews 
      WHERE automation_id = NEW.automation_id
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM public.automation_reviews 
      WHERE automation_id = NEW.automation_id
    )
  WHERE id = NEW.automation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ratings when reviews change
CREATE TRIGGER update_automation_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.automation_reviews
FOR EACH ROW
EXECUTE FUNCTION update_automation_rating();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update timestamp triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.automation_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Storage Buckets (Optional)

If you want to store automation icons or user avatars:

```sql
-- Create storage buckets via Supabase dashboard
-- 1. Go to Storage section
-- 2. Create buckets:
--    - automation-icons (public)
--    - user-avatars (public)
```

## Authentication Setup

1. Go to Authentication → Settings in Supabase dashboard
2. Enable Email provider
3. Configure email templates if needed
4. Set up redirect URLs for your app

## API Configuration

Your Supabase API should already be configured, but verify:
1. API URL matches your SUPABASE_URL
2. Anon key matches your SUPABASE_ANON_KEY
3. RLS is enabled on all tables
4. API rate limits are appropriate for your usage

## Testing the Connection

Run this in your app to test:
```javascript
import { testConnection } from './src/services/supabase/client';

// Test connection
testConnection().then(connected => {
  console.log('Supabase connected:', connected);
});
```

### 6. Public Shares Table (for automation sharing)
```sql
-- Create public shares table for automation sharing
CREATE TABLE IF NOT EXISTS public.public_shares (
  id TEXT PRIMARY KEY,
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE,
  automation_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_public_shares_automation_id ON public.public_shares(automation_id);
CREATE INDEX idx_public_shares_created_by ON public.public_shares(created_by);
CREATE INDEX idx_public_shares_expires_at ON public.public_shares(expires_at);

-- Enable RLS
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can view active, non-expired public shares
CREATE POLICY "Anyone can view active public shares" ON public.public_shares
  FOR SELECT USING (
    is_active = true AND 
    (expires_at IS NULL OR expires_at > NOW())
  );

-- Users can create public shares for their own automations
CREATE POLICY "Users can create public shares" ON public.public_shares
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE id = public_shares.automation_id 
      AND created_by = auth.uid()
    )
  );

-- Users can update their own public shares
CREATE POLICY "Users can update own public shares" ON public.public_shares
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own public shares
CREATE POLICY "Users can delete own public shares" ON public.public_shares
  FOR DELETE USING (auth.uid() = created_by);
```

### 7. Sharing Logs Table (for analytics)
```sql
-- Create sharing logs table for analytics
CREATE TABLE IF NOT EXISTS public.sharing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- 'url', 'email', 'sms', 'qr', 'nfc'
  recipients TEXT[], -- array of email addresses or phone numbers
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_sharing_logs_automation_id ON public.sharing_logs(automation_id);
CREATE INDEX idx_sharing_logs_shared_by ON public.sharing_logs(shared_by);
CREATE INDEX idx_sharing_logs_shared_at ON public.sharing_logs(shared_at);

-- Enable RLS
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own sharing logs
CREATE POLICY "Users can view own sharing logs" ON public.sharing_logs
  FOR SELECT USING (auth.uid() = shared_by);

-- Users can insert their own sharing logs
CREATE POLICY "Users can create sharing logs" ON public.sharing_logs
  FOR INSERT WITH CHECK (auth.uid() = shared_by);
```

### 8. Additional Functions and Triggers for Sharing

```sql
-- Function to increment access count for public shares
CREATE OR REPLACE FUNCTION increment_access_count(share_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.public_shares
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE id = share_id AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.public_shares
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get sharing analytics
CREATE OR REPLACE FUNCTION get_sharing_analytics(automation_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_shares', (
      SELECT COUNT(*) FROM public.sharing_logs 
      WHERE automation_id = automation_uuid
    ),
    'total_views', (
      SELECT COALESCE(SUM(access_count), 0) FROM public.public_shares 
      WHERE automation_id = automation_uuid
    ),
    'active_public_shares', (
      SELECT COUNT(*) FROM public.public_shares 
      WHERE automation_id = automation_uuid 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    ),
    'shares_by_method', (
      SELECT json_object_agg(method, method_count)
      FROM (
        SELECT method, COUNT(*) as method_count
        FROM public.sharing_logs 
        WHERE automation_id = automation_uuid
        GROUP BY method
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Troubleshooting

1. **Network Request Failed**: Check if emulator/device has internet access
2. **401 Unauthorized**: Verify your anon key is correct
3. **Permission Denied**: Check RLS policies
4. **Table not found**: Run the SQL scripts above
5. **CORS issues**: Add your domain to allowed origins in Supabase dashboard