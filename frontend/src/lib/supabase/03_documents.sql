-- Create documents table with vector support
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id UUID REFERENCES data_sources ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536) NULL, -- Optional embedding field
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_data_source_id ON documents(data_source_id);

-- Create policies for documents
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