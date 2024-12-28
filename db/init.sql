-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS vector;           -- For vector similarity search
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- For query performance monitoring

-- Set up row level security (RLS)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';  -- Replace in production

-- Configure TimeZone
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Verify extensions
SELECT installed_version FROM pg_available_extensions WHERE name = 'vector';
SELECT installed_version FROM pg_available_extensions WHERE name = 'uuid-ossp';

-- Note: The actual table creation will be handled in a separate migration file
-- This file only handles initial database setup and extension enabling 