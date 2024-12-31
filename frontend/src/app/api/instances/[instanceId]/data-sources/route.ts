import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const dataSourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  type: z.enum(['github', 'confluence', 'notion', 'slack', 'zendesk']),
  config: z.object({
    authToken: z.string().min(1, 'Auth token is required'),
    repositories: z.string().optional(),
    spaces: z.string().optional(),
    channels: z.string().optional(),
  }),
});

export async function GET(
  request: Request,
  { params }: { params: { instanceId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user has access to this instance
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id')
      .eq('id', params.instanceId)
      .single();

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }

    // Fetch data sources
    const { data: dataSources, error } = await supabase
      .from('data_sources')
      .select(`
        id,
        name,
        type,
        status,
        last_synced,
        config,
        created_at,
        updated_at,
        document_count
      `)
      .eq('instance_id', params.instanceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data sources:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data sources' },
        { status: 500 }
      );
    }

    return NextResponse.json(dataSources);
  } catch (error) {
    console.error('Error in data sources route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { instanceId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validationResult = dataSourceSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Check if instance exists and user has access
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id')
      .eq('id', params.instanceId)
      .single();

    if (instanceError || !instance) {
      return Response.json(
        { error: 'Instance not found or access denied' },
        { status: 404 }
      );
    }

    // Create data source
    const { data: dataSource, error: insertError } = await supabase
      .from('data_sources')
      .insert({
        instance_id: params.instanceId,
        name: validatedData.name,
        source_type: validatedData.type,
        auth_info: {
          token: validatedData.config.authToken,
          ...(validatedData.type === 'github' && validatedData.config.repositories
            ? { repositories: validatedData.config.repositories.split(',').map(r => r.trim()) }
            : {}),
          ...(validatedData.type === 'confluence' && validatedData.config.spaces
            ? { spaces: validatedData.config.spaces.split(',').map(s => s.trim()) }
            : {}),
          ...(validatedData.type === 'slack' && validatedData.config.channels
            ? { channels: validatedData.config.channels.split(',').map(c => c.trim()) }
            : {}),
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating data source:', insertError);
      return Response.json(
        { error: 'Failed to create data source' },
        { status: 500 }
      );
    }

    return Response.json(dataSource);
  } catch (error) {
    console.error('Error in data source creation:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 