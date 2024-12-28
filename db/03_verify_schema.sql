-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    'profiles',
    'instances',
    'deployments',
    'data_sources',
    'documents',
    'queries',
    'answers',
    'events'
);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'profiles',
    'instances',
    'deployments',
    'data_sources',
    'documents',
    'queries',
    'answers',
    'events'
);

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify indexes exist
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'profiles',
    'instances',
    'deployments',
    'data_sources',
    'documents',
    'queries',
    'answers',
    'events'
)
ORDER BY tablename, indexname;

-- Verify triggers exist
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name; 