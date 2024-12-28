-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name   text,
  role           text DEFAULT 'user',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Create instances table
CREATE TABLE IF NOT EXISTS public.instances (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name            text NOT NULL,
  environment     text NOT NULL,         -- e.g. 'public' or 'private'
  is_public       boolean DEFAULT false,
  status          text DEFAULT 'active',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Create deployments table
CREATE TABLE IF NOT EXISTS public.deployments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id     uuid NOT NULL REFERENCES public.instances (id) ON DELETE CASCADE,
  deployment_type text NOT NULL,  -- e.g. 'website_widget', 'slack_bot', 'discord_bot', 'api'
  config_json     jsonb,          -- store config details (API keys, color theme, etc.)
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Create data_sources table
CREATE TABLE IF NOT EXISTS public.data_sources (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id     uuid NOT NULL REFERENCES public.instances (id) ON DELETE CASCADE,
  source_type     text NOT NULL,        -- e.g. 'github', 'confluence', 'notion', etc.
  name            text NOT NULL,
  auth_info       jsonb,                -- tokens or credentials
  sync_frequency  interval,             -- how often to sync
  last_synced     timestamptz,
  sync_status     text DEFAULT 'idle',  -- 'idle', 'in_progress', 'failed', etc.
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Create documents table with vector support
CREATE TABLE IF NOT EXISTS public.documents (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id uuid NOT NULL REFERENCES public.data_sources (id) ON DELETE CASCADE,
  content        text NOT NULL,
  metadata       jsonb,                  -- store doc title, URL, line numbers, etc.
  embedding      vector(1536),           -- OpenAI's ada-002 uses 1536 dimensions
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Create queries table
CREATE TABLE IF NOT EXISTS public.queries (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id      uuid NOT NULL REFERENCES public.instances (id) ON DELETE CASCADE,
  user_id          uuid REFERENCES auth.users (id),
  user_fingerprint text,              -- for anonymous tracking
  question_text    text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- Create answers table
CREATE TABLE IF NOT EXISTS public.answers (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id       uuid NOT NULL REFERENCES public.queries (id) ON DELETE CASCADE,
  answer_text    text NOT NULL,
  citations      jsonb,               -- store array of doc IDs and snippets
  created_at     timestamptz DEFAULT now()
);

-- Create events table for analytics
CREATE TABLE IF NOT EXISTS public.events (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id      uuid NOT NULL REFERENCES public.instances (id) ON DELETE CASCADE,
  user_id          uuid REFERENCES auth.users (id),
  user_fingerprint text,
  event_type       text NOT NULL,     -- e.g. 'widget_opened', 'question_submitted'
  event_data       jsonb,
  created_at       timestamptz DEFAULT now()
);

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_instances_user_id ON public.instances (user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_instance_id ON public.deployments (instance_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_instance_id ON public.data_sources (instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_data_source_id ON public.documents (data_source_id);
CREATE INDEX IF NOT EXISTS idx_queries_instance_id ON public.queries (instance_id);
CREATE INDEX IF NOT EXISTS idx_answers_query_id ON public.answers (query_id);
CREATE INDEX IF NOT EXISTS idx_events_instance_id ON public.events (instance_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events (event_type);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON public.documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- Number of lists can be adjusted based on data size

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instances_updated_at
    BEFORE UPDATE ON public.instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at
    BEFORE UPDATE ON public.deployments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at
    BEFORE UPDATE ON public.data_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 