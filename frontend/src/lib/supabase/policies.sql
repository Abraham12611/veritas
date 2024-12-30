-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own instances" ON instances;
DROP POLICY IF EXISTS "Users can create instances" ON instances;
DROP POLICY IF EXISTS "Users can update own instances" ON instances;
DROP POLICY IF EXISTS "Users can delete own instances" ON instances;
DROP POLICY IF EXISTS "Users can view instance members" ON instance_members;
DROP POLICY IF EXISTS "Instance owners can manage members" ON instance_members;
DROP POLICY IF EXISTS "Users can view data sources of their instances" ON data_sources;
DROP POLICY IF EXISTS "Instance owners can create data sources" ON data_sources;
DROP POLICY IF EXISTS "Instance owners can update data sources" ON data_sources;
DROP POLICY IF EXISTS "Instance owners can delete data sources" ON data_sources;
DROP POLICY IF EXISTS "Users can view documents of their instances" ON documents;
DROP POLICY IF EXISTS "System can insert documents" ON documents;
DROP POLICY IF EXISTS "System can update documents" ON documents;
DROP POLICY IF EXISTS "Instance owners can delete documents" ON documents;
DROP POLICY IF EXISTS "Users can view queries of their instances" ON queries;
DROP POLICY IF EXISTS "Users can create queries for their instances" ON queries;
DROP POLICY IF EXISTS "Users can view answers to their queries" ON answers;
DROP POLICY IF EXISTS "System can create answers" ON answers;

-- Create necessary tables first
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instance_members (
  instance_id UUID REFERENCES instances ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (instance_id, user_id)
);

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES instances ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id UUID REFERENCES data_sources ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES instances ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  query_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id UUID REFERENCES queries ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Instance members policies
CREATE POLICY "Users can view instance members"
  ON instance_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = instance_members.instance_id
      AND (
        instances.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM instance_members im2
          WHERE im2.instance_id = instances.id
          AND im2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Instance owners can manage members"
  ON instance_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = instance_members.instance_id
      AND instances.user_id = auth.uid()
    )
  );

-- Instances table policies
CREATE POLICY "Users can view instances they own or belong to"
  ON instances FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM instance_members
      WHERE instance_members.instance_id = instances.id
      AND instance_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create instances"
  ON instances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instance owners can update their instances"
  ON instances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Instance owners can delete their instances"
  ON instances FOR DELETE
  USING (auth.uid() = user_id);

-- Data sources table policies
CREATE POLICY "Users can view data sources of their instances"
  ON data_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = data_sources.instance_id
      AND (
        instances.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM instance_members
          WHERE instance_members.instance_id = instances.id
          AND instance_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Instance owners can create data sources"
  ON data_sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = data_sources.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Instance owners can update data sources"
  ON data_sources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = data_sources.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Instance owners can delete data sources"
  ON data_sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = data_sources.instance_id
      AND instances.user_id = auth.uid()
    )
  );

-- Documents table policies
CREATE POLICY "Users can view documents of their instances"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_sources
      JOIN instances ON instances.id = data_sources.instance_id
      WHERE data_sources.id = documents.data_source_id
      AND (
        instances.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM instance_members
          WHERE instance_members.instance_id = instances.id
          AND instance_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "System can insert documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update documents"
  ON documents FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Instance owners can delete documents"
  ON documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM data_sources
      JOIN instances ON instances.id = data_sources.instance_id
      WHERE data_sources.id = documents.data_source_id
      AND instances.user_id = auth.uid()
    )
  );

-- Queries table policies
CREATE POLICY "Users can view queries of their instances"
  ON queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = queries.instance_id
      AND (
        instances.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM instance_members
          WHERE instance_members.instance_id = instances.id
          AND instance_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create queries for their instances"
  ON queries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = queries.instance_id
      AND (
        instances.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM instance_members
          WHERE instance_members.instance_id = instances.id
          AND instance_members.user_id = auth.uid()
        )
      )
    )
  );

-- Answers table policies
CREATE POLICY "Users can view answers to their queries"
  ON answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM queries
      JOIN instances ON instances.id = queries.instance_id
      WHERE queries.id = answers.query_id
      AND (
        instances.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM instance_members
          WHERE instance_members.instance_id = instances.id
          AND instance_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "System can create answers"
  ON answers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_instance_members_instance_id ON instance_members(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_members_user_id ON instance_members(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_instance_id ON data_sources(instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_data_source_id ON documents(data_source_id);
CREATE INDEX IF NOT EXISTS idx_queries_instance_id ON queries(instance_id);
CREATE INDEX IF NOT EXISTS idx_answers_query_id ON answers(query_id); 