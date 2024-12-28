-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Instances: Users can CRUD their own instances
CREATE POLICY "Users can view own instances"
    ON public.instances FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create instances"
    ON public.instances FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own instances"
    ON public.instances FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own instances"
    ON public.instances FOR DELETE
    USING (auth.uid() = user_id);

-- Deployments: Users can manage deployments for their instances
CREATE POLICY "Users can view instance deployments"
    ON public.deployments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.instances 
        WHERE instances.id = deployments.instance_id 
        AND (instances.user_id = auth.uid() OR instances.is_public = true)
    ));

CREATE POLICY "Users can create instance deployments"
    ON public.deployments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.instances 
        WHERE instances.id = deployments.instance_id 
        AND instances.user_id = auth.uid()
    ));

-- Data Sources: Similar to deployments
CREATE POLICY "Users can view instance data sources"
    ON public.data_sources FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.instances 
        WHERE instances.id = data_sources.instance_id 
        AND (instances.user_id = auth.uid() OR instances.is_public = true)
    ));

CREATE POLICY "Users can manage instance data sources"
    ON public.data_sources FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.instances 
        WHERE instances.id = data_sources.instance_id 
        AND instances.user_id = auth.uid()
    ));

-- Documents: Accessible if user has access to parent data source
CREATE POLICY "Users can view instance documents"
    ON public.documents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.data_sources 
        JOIN public.instances ON instances.id = data_sources.instance_id
        WHERE data_sources.id = documents.data_source_id 
        AND (instances.user_id = auth.uid() OR instances.is_public = true)
    ));

-- Queries: Users can view/create queries for their instances
CREATE POLICY "Users can view instance queries"
    ON public.queries FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.instances 
        WHERE instances.id = queries.instance_id 
        AND (instances.user_id = auth.uid() OR instances.is_public = true)
    ));

CREATE POLICY "Users can create queries"
    ON public.queries FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.instances 
        WHERE instances.id = queries.instance_id 
        AND (instances.user_id = auth.uid() OR instances.is_public = true)
    ));

-- Answers: Accessible if user can access parent query
CREATE POLICY "Users can view query answers"
    ON public.answers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.queries 
        JOIN public.instances ON instances.id = queries.instance_id
        WHERE queries.id = answers.query_id 
        AND (instances.user_id = auth.uid() OR instances.is_public = true)
    ));

-- Events: Similar to queries
CREATE POLICY "Users can view instance events"
    ON public.events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.instances 
        WHERE instances.id = events.instance_id 
        AND instances.user_id = auth.uid()
    ));

CREATE POLICY "Users can create events"
    ON public.events FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.instances 
        WHERE instances.id = events.instance_id 
        AND (instances.user_id = auth.uid() OR instances.is_public = true)
    )); 