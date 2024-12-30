import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const dataSourceSchema = z.object({
  name: z.string().min(3),
  type: z.enum(['github', 'confluence', 'notion', 'slack', 'zendesk']),
  config: z.object({
    authToken: z.string().min(1),
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
    const supabase = createRouteHandlerClient({ cookies });
    const json = await request.json();

    // Validate request body
    const validatedData = dataSourceSchema.parse(json);

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

    // Create data source
    const { data, error } = await supabase
      .from('data_sources')
      .insert({
        instance_id: params.instanceId,
        name: validatedData.name,
        type: validatedData.type,
        config: validatedData.config,
        status: 'active',
        last_synced: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating data source:', error);
      return NextResponse.json(
        { error: 'Failed to create data source' },
        { status: 500 }
      );
    }

    // TODO: Trigger initial sync in the background
    // This would typically be handled by a background job/queue

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in create data source route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 