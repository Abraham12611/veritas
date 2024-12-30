-- Step 1: Create tables
-----------------
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

-- Step 2: Create indexes
-----------------
CREATE INDEX IF NOT EXISTS idx_queries_instance_id ON queries(instance_id);
CREATE INDEX IF NOT EXISTS idx_answers_query_id ON answers(query_id);

-- Step 3: Enable RLS
-----------------
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (now safe since tables exist)
-----------------
DROP POLICY IF EXISTS "Users can view queries of their instances" ON queries;
DROP POLICY IF EXISTS "Users can create queries for their instances" ON queries;
DROP POLICY IF EXISTS "Users can view answers to their queries" ON answers;
DROP POLICY IF EXISTS "System can create answers" ON answers;

-- Step 5: Create policies for queries
-----------------
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

-- Step 6: Create policies for answers
-----------------
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