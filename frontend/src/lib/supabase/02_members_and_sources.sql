-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view instance members" ON instance_members;
DROP POLICY IF EXISTS "Instance owners can manage members" ON instance_members;
DROP POLICY IF EXISTS "Users can view data sources of their instances" ON data_sources;
DROP POLICY IF EXISTS "Instance owners can create data sources" ON data_sources;
DROP POLICY IF EXISTS "Instance owners can update data sources" ON data_sources;
DROP POLICY IF EXISTS "Instance owners can delete data sources" ON data_sources;

-- Create instance members and data sources tables
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

-- Enable RLS
ALTER TABLE instance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_instance_members_instance_id ON instance_members(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_members_user_id ON instance_members(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_instance_id ON data_sources(instance_id);

-- Create policies for instance members
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

-- Create policies for data sources
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