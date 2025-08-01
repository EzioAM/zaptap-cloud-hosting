-- Insert test automations into the database for execution count tracking
-- Using real user UUID: 03d628cc-5f83-44df-ac8a-6d96bfd16230

-- Basic Steps Test
INSERT INTO automations (
    id, 
    title, 
    description, 
    steps, 
    created_by, 
    is_public, 
    category, 
    tags, 
    execution_count, 
    average_rating, 
    rating_count
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Basic Steps Test',
    'Tests notification, delay, and basic functionality',
    '[
        {
            "id": "step1",
            "type": "notification",
            "title": "Welcome Notification",
            "enabled": true,
            "config": {"message": "🎉 Starting basic steps test!"}
        },
        {
            "id": "step2",
            "type": "delay",
            "title": "Wait 1 second",
            "enabled": true,
            "config": {"delay": 1000}
        },
        {
            "id": "step3",
            "type": "notification",
            "title": "Completion Notification",
            "enabled": true,
            "config": {"message": "✅ Basic steps test completed!"}
        }
    ]'::jsonb,
    '03d628cc-5f83-44df-ac8a-6d96bfd16230',
    false,
    'test',
    ARRAY['test', 'basic'],
    0,
    0,
    0
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    steps = EXCLUDED.steps,
    updated_at = NOW();

-- Variable Management Test
INSERT INTO automations (
    id, 
    title, 
    description, 
    steps, 
    created_by, 
    is_public, 
    category, 
    tags, 
    execution_count, 
    average_rating, 
    rating_count
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'Variable Management Test',
    'Tests variable setting, getting, and processing',
    '[
        {
            "id": "step1",
            "type": "variable",
            "title": "Set Username",
            "enabled": true,
            "config": {"name": "userName", "value": "TestUser123"}
        },
        {
            "id": "step2",
            "type": "variable",
            "title": "Set App Name",
            "enabled": true,
            "config": {"name": "appName", "value": "ShortcutsLike"}
        },
        {
            "id": "step3",
            "type": "get_variable",
            "title": "Get Username",
            "enabled": true,
            "config": {"name": "userName", "defaultValue": "DefaultUser"}
        },
        {
            "id": "step4",
            "type": "notification",
            "title": "Show Variables",
            "enabled": true,
            "config": {"message": "User: {{userName}} using {{appName}}"}
        }
    ]'::jsonb,
    '03d628cc-5f83-44df-ac8a-6d96bfd16230',
    false,
    'test',
    ARRAY['test', 'variables'],
    0,
    0,
    0
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    steps = EXCLUDED.steps,
    updated_at = NOW();

-- Text Processing Test
INSERT INTO automations (
    id, 
    title, 
    description, 
    steps, 
    created_by, 
    is_public, 
    category, 
    tags, 
    execution_count, 
    average_rating, 
    rating_count
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003',
    'Text Processing Test',
    'Tests text combination, formatting, and manipulation',
    '[
        {
            "id": "step1",
            "type": "text",
            "title": "Combine Text",
            "enabled": true,
            "config": {"action": "combine", "text1": "Hello", "text2": "World", "separator": " "}
        },
        {
            "id": "step2",
            "type": "text",
            "title": "Format Text",
            "enabled": true,
            "config": {"action": "format", "text1": "automation test"}
        },
        {
            "id": "step3",
            "type": "notification",
            "title": "Show Results",
            "enabled": true,
            "config": {"message": "Text processing completed successfully!"}
        }
    ]'::jsonb,
    '03d628cc-5f83-44df-ac8a-6d96bfd16230',
    false,
    'test',
    ARRAY['test', 'text'],
    0,
    0,
    0
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    steps = EXCLUDED.steps,
    updated_at = NOW();

-- Math Operations Test
INSERT INTO automations (
    id, 
    title, 
    description, 
    steps, 
    created_by, 
    is_public, 
    category, 
    tags, 
    execution_count, 
    average_rating, 
    rating_count
) VALUES (
    '550e8400-e29b-41d4-a716-446655440004',
    'Math Operations Test',
    'Tests mathematical calculations',
    '[
        {
            "id": "step1",
            "type": "math",
            "title": "Add Numbers",
            "enabled": true,
            "config": {"operation": "add", "number1": 15, "number2": 25}
        },
        {
            "id": "step2",
            "type": "math",
            "title": "Multiply Numbers",
            "enabled": true,
            "config": {"operation": "multiply", "number1": 7, "number2": 8}
        },
        {
            "id": "step3",
            "type": "math",
            "title": "Divide Numbers",
            "enabled": true,
            "config": {"operation": "divide", "number1": 100, "number2": 4}
        },
        {
            "id": "step4",
            "type": "notification",
            "title": "Math Complete",
            "enabled": true,
            "config": {"message": "🧮 Math operations test completed!"}
        }
    ]'::jsonb,
    '03d628cc-5f83-44df-ac8a-6d96bfd16230',
    false,
    'test',
    ARRAY['test', 'math'],
    0,
    0,
    0
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    steps = EXCLUDED.steps,
    updated_at = NOW();

-- Logic Conditions Test  
INSERT INTO automations (
    id, 
    title, 
    description, 
    steps, 
    created_by, 
    is_public, 
    category, 
    tags, 
    execution_count, 
    average_rating, 
    rating_count
) VALUES (
    '550e8400-e29b-41d4-a716-446655440005',
    'Logic Conditions Test',
    'Tests conditional logic and comparisons',
    '[
        {
            "id": "step1",
            "type": "variable",
            "title": "Set Test Number",
            "enabled": true,
            "config": {"name": "testNumber", "value": "42"}
        },
        {
            "id": "step2",
            "type": "condition",
            "title": "Check if Greater Than 30",
            "enabled": true,
            "config": {"variable": "testNumber", "condition": "greater", "value": "30"}
        },
        {
            "id": "step3",
            "type": "variable",
            "title": "Set Test Text",
            "enabled": true,
            "config": {"name": "testText", "value": "automation"}
        },
        {
            "id": "step4",
            "type": "condition",
            "title": "Check if Contains \"auto\"",
            "enabled": true,
            "config": {"variable": "testText", "condition": "contains", "value": "auto"}
        },
        {
            "id": "step5",
            "type": "notification",
            "title": "Logic Test Complete",
            "enabled": true,
            "config": {"message": "🧠 Logic conditions test completed!"}
        }
    ]'::jsonb,
    '03d628cc-5f83-44df-ac8a-6d96bfd16230',
    false,
    'test',
    ARRAY['test', 'logic'],
    0,
    0,
    0
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    steps = EXCLUDED.steps,
    updated_at = NOW();

-- Device Integration Test
INSERT INTO automations (
    id, 
    title, 
    description, 
    steps, 
    created_by, 
    is_public, 
    category, 
    tags, 
    execution_count, 
    average_rating, 
    rating_count
) VALUES (
    '550e8400-e29b-41d4-a716-446655440006',
    'Device Integration Test',
    'Tests device features (clipboard, location, etc.)',
    '[
        {
            "id": "step1",
            "type": "clipboard",
            "title": "Copy Test Text",
            "enabled": true,
            "config": {"action": "copy", "text": "Automation test clipboard content!"}
        },
        {
            "id": "step2",
            "type": "clipboard",
            "title": "Read Clipboard",
            "enabled": true,
            "config": {"action": "paste"}
        },
        {
            "id": "step3",
            "type": "notification",
            "title": "Device Test Complete",
            "enabled": true,
            "config": {"message": "📱 Device integration test completed!"}
        }
    ]'::jsonb,
    '03d628cc-5f83-44df-ac8a-6d96bfd16230',
    false,
    'test',
    ARRAY['test', 'device'],
    0,
    0,
    0
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    steps = EXCLUDED.steps,
    updated_at = NOW();

-- Verify the insertions
SELECT id, title, execution_count, last_run_at FROM automations WHERE category = 'test';