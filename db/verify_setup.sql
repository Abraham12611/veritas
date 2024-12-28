-- Verify extensions are properly installed
SELECT 
    name,
    installed_version,
    default_version,
    comment
FROM pg_available_extensions
WHERE name IN ('vector', 'uuid-ossp', 'pg_stat_statements');

-- Test vector functionality
CREATE TABLE IF NOT EXISTS vector_test (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    embedding vector(3)
);

-- Insert a test vector
INSERT INTO vector_test (embedding) VALUES ('[1,2,3]'::vector);

-- Query to verify vector operations work
SELECT * FROM vector_test;

-- Clean up test
DROP TABLE vector_test; 