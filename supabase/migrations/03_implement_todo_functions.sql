-- Migration: Implement all TODO functions with actual logic

-- 1. Developer role management function
CREATE OR REPLACE FUNCTION set_developer_role_for_email(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update user role to developer for the specified email
    UPDATE profiles 
    SET role = 'developer',
        updated_at = now()
    WHERE id = (SELECT id FROM auth.users WHERE email = target_email LIMIT 1);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with email % not found', target_email;
    END IF;
END;
$$;

-- 2. User automation statistics
CREATE OR REPLACE FUNCTION get_user_automation_stats(user_id uuid)
RETURNS TABLE(
    total_automations bigint,
    total_executions bigint,
    successful_executions bigint,
    failed_executions bigint,
    total_shares bigint,
    total_reviews bigint,
    average_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT a.id) as total_automations,
        COUNT(DISTINCT e.id) as total_executions,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'success') as successful_executions,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'failed') as failed_executions,
        COUNT(DISTINCT s.id) as total_shares,
        COUNT(DISTINCT r.id) as total_reviews,
        COALESCE(AVG(r.rating), 0) as average_rating
    FROM automations a
    LEFT JOIN executions e ON a.id = e.automation_id
    LEFT JOIN shares s ON a.id = s.automation_id
    LEFT JOIN reviews r ON a.id = r.automation_id
    WHERE a.user_id = $1;
END;
$$;

-- 3. Automation performance metrics
CREATE OR REPLACE FUNCTION get_automation_performance(automation_id uuid)
RETURNS TABLE(
    execution_count bigint,
    success_rate numeric,
    average_duration interval,
    last_execution_at timestamptz,
    total_shares bigint,
    total_reviews bigint,
    average_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(e.id) as execution_count,
        CASE 
            WHEN COUNT(e.id) > 0 THEN 
                ROUND(COUNT(e.id) FILTER (WHERE e.status = 'success')::numeric / COUNT(e.id) * 100, 2)
            ELSE 0 
        END as success_rate,
        AVG(e.completed_at - e.started_at) as average_duration,
        MAX(e.started_at) as last_execution_at,
        COUNT(DISTINCT s.id) as total_shares,
        COUNT(DISTINCT r.id) as total_reviews,
        COALESCE(AVG(r.rating), 0) as average_rating
    FROM automations a
    LEFT JOIN executions e ON a.id = e.automation_id
    LEFT JOIN shares s ON a.id = s.automation_id
    LEFT JOIN reviews r ON a.id = r.automation_id
    WHERE a.id = $1
    GROUP BY a.id;
END;
$$;

-- 4. Permission checking function
CREATE OR REPLACE FUNCTION user_has_permission(user_id uuid, resource_type text, resource_id uuid, permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_permission boolean := false;
    user_role text;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM profiles WHERE id = user_id;
    
    -- Developers have all permissions
    IF user_role = 'developer' OR user_role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Check specific resource permissions
    CASE resource_type
        WHEN 'automation' THEN
            CASE permission
                WHEN 'read' THEN
                    -- Can read if owner or automation is public
                    SELECT EXISTS(
                        SELECT 1 FROM automations 
                        WHERE id = resource_id 
                        AND (user_id = $1 OR is_public = true)
                    ) INTO has_permission;
                WHEN 'write', 'delete' THEN
                    -- Can only write/delete if owner
                    SELECT EXISTS(
                        SELECT 1 FROM automations 
                        WHERE id = resource_id AND user_id = $1
                    ) INTO has_permission;
                ELSE
                    has_permission := false;
            END CASE;
        WHEN 'review' THEN
            CASE permission
                WHEN 'read' THEN
                    has_permission := true; -- Anyone can read reviews
                WHEN 'write' THEN
                    -- Can write if haven't reviewed this automation yet
                    SELECT NOT EXISTS(
                        SELECT 1 FROM reviews 
                        WHERE automation_id = resource_id AND user_id = $1
                    ) INTO has_permission;
                WHEN 'delete' THEN
                    -- Can delete own reviews
                    SELECT EXISTS(
                        SELECT 1 FROM reviews 
                        WHERE id = resource_id AND user_id = $1
                    ) INTO has_permission;
                ELSE
                    has_permission := false;
            END CASE;
        ELSE
            has_permission := false;
    END CASE;
    
    RETURN has_permission;
END;
$$;

-- 5. Role checking function
CREATE OR REPLACE FUNCTION user_has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = user_id;
    
    -- Role hierarchy: admin > developer > user
    CASE required_role
        WHEN 'user' THEN
            RETURN true; -- Everyone has at least user role
        WHEN 'developer' THEN
            RETURN user_role IN ('developer', 'admin');
        WHEN 'admin' THEN
            RETURN user_role = 'admin';
        ELSE
            RETURN false;
    END CASE;
END;
$$;

-- 6. Track automation views
CREATE OR REPLACE FUNCTION track_automation_view(automation_id uuid, viewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert or update view tracking
    INSERT INTO automation_views (automation_id, user_id, viewed_at, view_count)
    VALUES ($1, $2, now(), 1)
    ON CONFLICT (automation_id, user_id) 
    DO UPDATE SET 
        viewed_at = now(),
        view_count = automation_views.view_count + 1;
    
    -- Update automation view count
    UPDATE automations 
    SET view_count = view_count + 1,
        updated_at = now()
    WHERE id = $1;
END;
$$;

-- 7. Track automation execution
CREATE OR REPLACE FUNCTION track_automation_execution(
    p_automation_id uuid, 
    p_user_id uuid, 
    p_deployment_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    execution_id uuid;
BEGIN
    -- Create execution record
    INSERT INTO executions (
        automation_id, 
        user_id, 
        deployment_type,
        status,
        started_at
    )
    VALUES (
        p_automation_id, 
        p_user_id, 
        p_deployment_type,
        'running',
        now()
    )
    RETURNING id INTO execution_id;
    
    -- Update automation execution count
    UPDATE automations 
    SET execution_count = execution_count + 1,
        last_executed_at = now(),
        updated_at = now()
    WHERE id = p_automation_id;
    
    RETURN execution_id;
END;
$$;

-- 8. Update execution status
CREATE OR REPLACE FUNCTION update_execution_status(
    execution_id uuid, 
    new_status text, 
    error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE executions 
    SET status = new_status,
        error_message = $3,
        completed_at = CASE 
            WHEN new_status IN ('success', 'failed') THEN now() 
            ELSE completed_at 
        END,
        updated_at = now()
    WHERE id = $1;
    
    -- Update automation success/failure counts
    IF new_status = 'success' THEN
        UPDATE automations a
        SET success_count = success_count + 1
        FROM executions e
        WHERE e.id = $1 AND e.automation_id = a.id;
    ELSIF new_status = 'failed' THEN
        UPDATE automations a
        SET failure_count = failure_count + 1
        FROM executions e
        WHERE e.id = $1 AND e.automation_id = a.id;
    END IF;
END;
$$;

-- 9. Get user's engagement stats
CREATE OR REPLACE FUNCTION get_user_engagement_stats(user_id uuid)
RETURNS TABLE(
    automations_created bigint,
    automations_shared bigint,
    reviews_written bigint,
    comments_posted bigint,
    helpful_votes_received bigint,
    total_automation_views bigint,
    total_automation_executions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM automations WHERE user_id = $1) as automations_created,
        (SELECT COUNT(*) FROM shares WHERE user_id = $1) as automations_shared,
        (SELECT COUNT(*) FROM reviews WHERE user_id = $1) as reviews_written,
        (SELECT COUNT(*) FROM comments WHERE user_id = $1) as comments_posted,
        (SELECT SUM(helpful_count) FROM reviews WHERE user_id = $1) as helpful_votes_received,
        (SELECT SUM(view_count) FROM automations WHERE user_id = $1) as total_automation_views,
        (SELECT SUM(execution_count) FROM automations WHERE user_id = $1) as total_automation_executions;
END;
$$;

-- 10. Get popular automations
CREATE OR REPLACE FUNCTION get_popular_automations(
    limit_count integer DEFAULT 10,
    time_period interval DEFAULT interval '7 days'
)
RETURNS TABLE(
    automation_id uuid,
    name text,
    description text,
    creator_name text,
    execution_count bigint,
    view_count bigint,
    average_rating numeric,
    review_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as automation_id,
        a.name,
        a.description,
        p.name as creator_name,
        a.execution_count,
        a.view_count,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as review_count
    FROM automations a
    JOIN profiles p ON a.user_id = p.id
    LEFT JOIN reviews r ON a.id = r.automation_id
    WHERE a.is_public = true
    AND a.created_at >= now() - $2
    GROUP BY a.id, a.name, a.description, p.name, a.execution_count, a.view_count
    ORDER BY a.execution_count DESC, a.view_count DESC
    LIMIT $1;
END;
$$;

-- 11. Before insert trigger for profiles
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, email, name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'marcminott@gmail.com' THEN 'developer'
            ELSE 'user'
        END,
        NEW.created_at,
        NEW.created_at
    );
    RETURN NEW;
END;
$$;

-- 12. Before automation insert trigger
CREATE OR REPLACE FUNCTION before_automation_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set defaults
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    NEW.version := COALESCE(NEW.version, 1);
    NEW.is_public := COALESCE(NEW.is_public, false);
    NEW.execution_count := COALESCE(NEW.execution_count, 0);
    NEW.view_count := COALESCE(NEW.view_count, 0);
    NEW.success_count := COALESCE(NEW.success_count, 0);
    NEW.failure_count := COALESCE(NEW.failure_count, 0);
    
    RETURN NEW;
END;
$$;

-- 13. Before automation update trigger
CREATE OR REPLACE FUNCTION before_automation_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update timestamp and increment version
    NEW.updated_at := now();
    
    -- Increment version if content changed
    IF OLD.name != NEW.name OR OLD.description != NEW.description OR OLD.is_public != NEW.is_public THEN
        NEW.version := OLD.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 14. Create share link
CREATE OR REPLACE FUNCTION create_share_link(
    p_automation_id uuid,
    p_user_id uuid,
    p_expires_at timestamptz DEFAULT NULL,
    p_max_uses integer DEFAULT NULL
)
RETURNS TABLE(
    share_id uuid,
    share_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_share_id uuid;
    v_share_code text;
BEGIN
    -- Generate unique share code
    v_share_code := encode(gen_random_bytes(12), 'base64');
    v_share_code := replace(v_share_code, '/', '_');
    v_share_code := replace(v_share_code, '+', '-');
    
    -- Create share record
    INSERT INTO shares (
        automation_id,
        user_id,
        share_code,
        expires_at,
        max_uses,
        created_at
    )
    VALUES (
        p_automation_id,
        p_user_id,
        v_share_code,
        p_expires_at,
        p_max_uses,
        now()
    )
    RETURNING id INTO v_share_id;
    
    RETURN QUERY SELECT v_share_id, v_share_code;
END;
$$;

-- 15. Redeem share link
CREATE OR REPLACE FUNCTION redeem_share_link(p_share_code text, p_user_id uuid)
RETURNS TABLE(
    automation_id uuid,
    success boolean,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_share record;
    v_automation_id uuid;
BEGIN
    -- Get share details
    SELECT * INTO v_share
    FROM shares
    WHERE share_code = p_share_code
    FOR UPDATE;
    
    -- Check if share exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Invalid share code';
        RETURN;
    END IF;
    
    -- Check if expired
    IF v_share.expires_at IS NOT NULL AND v_share.expires_at < now() THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Share link has expired';
        RETURN;
    END IF;
    
    -- Check if max uses reached
    IF v_share.max_uses IS NOT NULL AND v_share.use_count >= v_share.max_uses THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Share link has reached maximum uses';
        RETURN;
    END IF;
    
    -- Update use count
    UPDATE shares
    SET use_count = use_count + 1,
        last_used_at = now()
    WHERE id = v_share.id;
    
    -- Track the redemption
    INSERT INTO share_redemptions (share_id, user_id, redeemed_at)
    VALUES (v_share.id, p_user_id, now());
    
    v_automation_id := v_share.automation_id;
    
    RETURN QUERY SELECT v_automation_id, true, 'Share link redeemed successfully';
END;
$$;

-- 16. Get share statistics
CREATE OR REPLACE FUNCTION get_share_stats(p_share_id uuid)
RETURNS TABLE(
    total_uses bigint,
    unique_users bigint,
    first_used_at timestamptz,
    last_used_at timestamptz,
    days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.use_count as total_uses,
        COUNT(DISTINCT sr.user_id) as unique_users,
        MIN(sr.redeemed_at) as first_used_at,
        MAX(sr.redeemed_at) as last_used_at,
        CASE 
            WHEN s.expires_at IS NOT NULL THEN 
                GREATEST(0, EXTRACT(DAY FROM s.expires_at - now())::integer)
            ELSE NULL
        END as days_remaining
    FROM shares s
    LEFT JOIN share_redemptions sr ON s.id = sr.share_id
    WHERE s.id = p_share_id
    GROUP BY s.id, s.use_count, s.expires_at;
END;
$$;

-- 17. Clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete expired shares and their redemptions
    WITH deleted_shares AS (
        DELETE FROM shares
        WHERE expires_at < now() - interval '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_shares;
    
    RETURN deleted_count;
END;
$$;

-- 18. Get trending automations
CREATE OR REPLACE FUNCTION get_trending_automations(
    limit_count integer DEFAULT 10,
    time_period interval DEFAULT interval '24 hours'
)
RETURNS TABLE(
    automation_id uuid,
    name text,
    description text,
    creator_name text,
    trend_score numeric,
    recent_executions bigint,
    recent_views bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH recent_activity AS (
        SELECT 
            a.id,
            COUNT(DISTINCT e.id) as recent_executions,
            COUNT(DISTINCT av.id) as recent_views
        FROM automations a
        LEFT JOIN executions e ON a.id = e.automation_id 
            AND e.started_at >= now() - $2
        LEFT JOIN automation_views av ON a.id = av.automation_id 
            AND av.viewed_at >= now() - $2
        WHERE a.is_public = true
        GROUP BY a.id
    )
    SELECT 
        a.id as automation_id,
        a.name,
        a.description,
        p.name as creator_name,
        -- Trend score based on recent activity vs overall activity
        ROUND(
            (ra.recent_executions * 2.0 + ra.recent_views) / 
            GREATEST(1, EXTRACT(EPOCH FROM $2) / 3600)::numeric, 
            2
        ) as trend_score,
        ra.recent_executions,
        ra.recent_views
    FROM automations a
    JOIN profiles p ON a.user_id = p.id
    JOIN recent_activity ra ON a.id = ra.id
    WHERE ra.recent_executions > 0 OR ra.recent_views > 0
    ORDER BY trend_score DESC
    LIMIT $1;
END;
$$;

-- 19. Get automation recommendations
CREATE OR REPLACE FUNCTION get_automation_recommendations(
    p_user_id uuid,
    limit_count integer DEFAULT 10
)
RETURNS TABLE(
    automation_id uuid,
    name text,
    description text,
    creator_name text,
    recommendation_score numeric,
    reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH user_preferences AS (
        -- Get categories and tags from user's previous interactions
        SELECT 
            a.category,
            COUNT(*) as interaction_count
        FROM automations a
        WHERE a.id IN (
            SELECT automation_id FROM executions WHERE user_id = p_user_id
            UNION
            SELECT automation_id FROM reviews WHERE user_id = p_user_id
            UNION
            SELECT automation_id FROM automation_views WHERE user_id = p_user_id
        )
        GROUP BY a.category
    )
    SELECT 
        a.id as automation_id,
        a.name,
        a.description,
        p.name as creator_name,
        -- Score based on category match and popularity
        ROUND(
            COALESCE(up.interaction_count, 0) * 10 +
            LOG(GREATEST(1, a.execution_count)) * 5 +
            COALESCE(AVG(r.rating), 0) * 2,
            2
        ) as recommendation_score,
        CASE 
            WHEN up.interaction_count > 0 THEN 'Based on your interests in ' || a.category
            WHEN a.execution_count > 100 THEN 'Popular automation'
            ELSE 'Recommended for you'
        END as reason
    FROM automations a
    JOIN profiles p ON a.user_id = p.id
    LEFT JOIN user_preferences up ON a.category = up.category
    LEFT JOIN reviews r ON a.id = r.automation_id
    WHERE a.is_public = true
    AND a.user_id != p_user_id -- Don't recommend user's own automations
    AND NOT EXISTS (
        -- Not already executed by user
        SELECT 1 FROM executions WHERE automation_id = a.id AND user_id = p_user_id
    )
    GROUP BY a.id, a.name, a.description, p.name, a.category, a.execution_count, up.interaction_count
    ORDER BY recommendation_score DESC
    LIMIT $1;
END;
$$;

-- 20. Create review with duplicate check
CREATE OR REPLACE FUNCTION create_review_safe(
    p_automation_id uuid,
    p_user_id uuid,
    p_rating integer,
    p_title text,
    p_content text
)
RETURNS TABLE(
    review_id uuid,
    success boolean,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_review_id uuid;
BEGIN
    -- Check if user already reviewed this automation
    IF EXISTS (
        SELECT 1 FROM reviews 
        WHERE automation_id = p_automation_id AND user_id = p_user_id
    ) THEN
        RETURN QUERY SELECT NULL::uuid, false, 'You have already reviewed this automation';
        RETURN;
    END IF;
    
    -- Check if rating is valid
    IF p_rating < 1 OR p_rating > 5 THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Rating must be between 1 and 5';
        RETURN;
    END IF;
    
    -- Create review
    INSERT INTO reviews (
        automation_id,
        user_id,
        rating,
        title,
        content,
        created_at,
        updated_at
    )
    VALUES (
        p_automation_id,
        p_user_id,
        p_rating,
        p_title,
        p_content,
        now(),
        now()
    )
    RETURNING id INTO v_review_id;
    
    -- Update automation average rating
    UPDATE automations a
    SET average_rating = (
        SELECT AVG(rating) FROM reviews WHERE automation_id = a.id
    )
    WHERE id = p_automation_id;
    
    RETURN QUERY SELECT v_review_id, true, 'Review created successfully';
END;
$$;

-- 21. Vote review helpful
CREATE OR REPLACE FUNCTION vote_review_helpful(p_review_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM review_votes 
        WHERE review_id = p_review_id AND user_id = p_user_id
    ) THEN
        RETURN false;
    END IF;
    
    -- Add vote
    INSERT INTO review_votes (review_id, user_id, created_at)
    VALUES (p_review_id, p_user_id, now());
    
    -- Update helpful count
    UPDATE reviews
    SET helpful_count = helpful_count + 1
    WHERE id = p_review_id;
    
    RETURN true;
END;
$$;

-- 22. Get automation history
CREATE OR REPLACE FUNCTION get_automation_history(
    p_automation_id uuid,
    limit_count integer DEFAULT 50
)
RETURNS TABLE(
    event_type text,
    event_description text,
    event_timestamp timestamptz,
    user_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    -- Get executions
    SELECT 
        'execution' as event_type,
        CASE 
            WHEN e.status = 'success' THEN 'Automation executed successfully'
            WHEN e.status = 'failed' THEN 'Automation execution failed: ' || COALESCE(e.error_message, 'Unknown error')
            ELSE 'Automation execution ' || e.status
        END as event_description,
        e.started_at as event_timestamp,
        p.name as user_name
    FROM executions e
    JOIN profiles p ON e.user_id = p.id
    WHERE e.automation_id = p_automation_id
    
    UNION ALL
    
    -- Get reviews
    SELECT 
        'review' as event_type,
        'New review: ' || r.rating || ' stars - ' || COALESCE(r.title, 'No title') as event_description,
        r.created_at as event_timestamp,
        p.name as user_name
    FROM reviews r
    JOIN profiles p ON r.user_id = p.id
    WHERE r.automation_id = p_automation_id
    
    UNION ALL
    
    -- Get shares
    SELECT 
        'share' as event_type,
        'Automation shared' as event_description,
        s.created_at as event_timestamp,
        p.name as user_name
    FROM shares s
    JOIN profiles p ON s.user_id = p.id
    WHERE s.automation_id = p_automation_id
    
    ORDER BY event_timestamp DESC
    LIMIT limit_count;
END;
$$;

-- 23. Get system statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(
    total_users bigint,
    active_users_24h bigint,
    total_automations bigint,
    public_automations bigint,
    total_executions bigint,
    executions_24h bigint,
    total_reviews bigint,
    average_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM profiles) as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM executions WHERE started_at >= now() - interval '24 hours') as active_users_24h,
        (SELECT COUNT(*) FROM automations) as total_automations,
        (SELECT COUNT(*) FROM automations WHERE is_public = true) as public_automations,
        (SELECT COUNT(*) FROM executions) as total_executions,
        (SELECT COUNT(*) FROM executions WHERE started_at >= now() - interval '24 hours') as executions_24h,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT ROUND(AVG(rating), 2) FROM reviews) as average_rating;
END;
$$;

-- 24. Batch update automation statistics
CREATE OR REPLACE FUNCTION update_automation_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update all automation statistics in one go
    UPDATE automations a
    SET 
        execution_count = COALESCE(e.count, 0),
        success_count = COALESCE(e.success_count, 0),
        failure_count = COALESCE(e.failure_count, 0),
        average_rating = COALESCE(r.avg_rating, 0),
        review_count = COALESCE(r.count, 0),
        updated_at = now()
    FROM (
        SELECT 
            automation_id,
            COUNT(*) as count,
            COUNT(*) FILTER (WHERE status = 'success') as success_count,
            COUNT(*) FILTER (WHERE status = 'failed') as failure_count
        FROM executions
        GROUP BY automation_id
    ) e
    FULL OUTER JOIN (
        SELECT 
            automation_id,
            COUNT(*) as count,
            AVG(rating) as avg_rating
        FROM reviews
        GROUP BY automation_id
    ) r ON e.automation_id = r.automation_id
    WHERE a.id = COALESCE(e.automation_id, r.automation_id);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_developer_role_for_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_automation_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_performance TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION track_automation_view TO authenticated;
GRANT EXECUTE ON FUNCTION track_automation_execution TO authenticated;
GRANT EXECUTE ON FUNCTION update_execution_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_engagement_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_automations TO authenticated;
GRANT EXECUTE ON FUNCTION create_share_link TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_share_link TO authenticated;
GRANT EXECUTE ON FUNCTION get_share_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_automations TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION create_review_safe TO authenticated;
GRANT EXECUTE ON FUNCTION vote_review_helpful TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_stats TO authenticated;

-- Add trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created' 
        AND tgrelid = 'auth.users'::regclass
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION on_auth_user_created();
    END IF;
END $$;

-- Add automation triggers if not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'before_automation_insert_trigger' 
        AND tgrelid = 'automations'::regclass
    ) THEN
        CREATE TRIGGER before_automation_insert_trigger
            BEFORE INSERT ON automations
            FOR EACH ROW
            EXECUTE FUNCTION before_automation_insert();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'before_automation_update_trigger' 
        AND tgrelid = 'automations'::regclass
    ) THEN
        CREATE TRIGGER before_automation_update_trigger
            BEFORE UPDATE ON automations
            FOR EACH ROW
            EXECUTE FUNCTION before_automation_update();
    END IF;
END $$;

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS automation_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid REFERENCES automations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at timestamptz DEFAULT now(),
    view_count integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    UNIQUE(automation_id, user_id)
);

CREATE TABLE IF NOT EXISTS share_redemptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    share_id uuid REFERENCES shares(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    redeemed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(review_id, user_id)
);

-- Add missing columns to existing tables if they don't exist
DO $$
BEGIN
    -- Add columns to automations table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'view_count') THEN
        ALTER TABLE automations ADD COLUMN view_count integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'success_count') THEN
        ALTER TABLE automations ADD COLUMN success_count integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'failure_count') THEN
        ALTER TABLE automations ADD COLUMN failure_count integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'average_rating') THEN
        ALTER TABLE automations ADD COLUMN average_rating numeric DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'review_count') THEN
        ALTER TABLE automations ADD COLUMN review_count integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'last_executed_at') THEN
        ALTER TABLE automations ADD COLUMN last_executed_at timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'category') THEN
        ALTER TABLE automations ADD COLUMN category text;
    END IF;
    
    -- Add columns to shares table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shares' AND column_name = 'share_code') THEN
        ALTER TABLE shares ADD COLUMN share_code text UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shares' AND column_name = 'expires_at') THEN
        ALTER TABLE shares ADD COLUMN expires_at timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shares' AND column_name = 'max_uses') THEN
        ALTER TABLE shares ADD COLUMN max_uses integer;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shares' AND column_name = 'use_count') THEN
        ALTER TABLE shares ADD COLUMN use_count integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shares' AND column_name = 'last_used_at') THEN
        ALTER TABLE shares ADD COLUMN last_used_at timestamptz;
    END IF;
    
    -- Add columns to executions table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'executions' AND column_name = 'deployment_type') THEN
        ALTER TABLE executions ADD COLUMN deployment_type text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'executions' AND column_name = 'error_message') THEN
        ALTER TABLE executions ADD COLUMN error_message text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'executions' AND column_name = 'completed_at') THEN
        ALTER TABLE executions ADD COLUMN completed_at timestamptz;
    END IF;
    
    -- Add columns to reviews table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'helpful_count') THEN
        ALTER TABLE reviews ADD COLUMN helpful_count integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'title') THEN
        ALTER TABLE reviews ADD COLUMN title text;
    END IF;
END $$;

-- Finally, set developer role for marcminott@gmail.com
SELECT set_developer_role_for_email('marcminott@gmail.com');