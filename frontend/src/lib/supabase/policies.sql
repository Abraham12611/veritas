-- Enable RLS on all tables
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Organizations policies
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can update their organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Instances policies
CREATE POLICY "Users can view instances they have access to"
ON instances FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create instances"
ON instances FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

CREATE POLICY "Users can update their own instances or org instances if editor/admin"
ON instances FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  )
)
WITH CHECK (
  user_id = auth.uid() OR
  (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  )
);

CREATE POLICY "Users can delete their own instances or org instances if admin"
ON instances FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);

-- Data Sources policies
CREATE POLICY "Users can view data sources of their instances"
ON data_sources FOR SELECT
TO authenticated
USING (
  instance_id IN (
    SELECT id 
    FROM instances 
    WHERE user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create data sources for their instances"
ON data_sources FOR INSERT
TO authenticated
WITH CHECK (
  instance_id IN (
    SELECT id 
    FROM instances 
    WHERE user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  )
);

CREATE POLICY "Users can update data sources of their instances"
ON data_sources FOR UPDATE
TO authenticated
USING (
  instance_id IN (
    SELECT id 
    FROM instances 
    WHERE user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  )
)
WITH CHECK (
  instance_id IN (
    SELECT id 
    FROM instances 
    WHERE user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  )
);

CREATE POLICY "Users can delete data sources of their instances"
ON data_sources FOR DELETE
TO authenticated
USING (
  instance_id IN (
    SELECT id 
    FROM instances 
    WHERE user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  )
); 