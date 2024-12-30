import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const dataSourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['github', 'confluence', 'notion', 'slack', 'zendesk']),
  instance_id: z.string().uuid(),
  config: z.record(z.any()),
});

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: dataSources, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data sources:', error);
      return NextResponse.json({ error: 'Failed to fetch data sources' }, { status: 500 });
    }

    return NextResponse.json(dataSources);
  } catch (error) {
    console.error('Error in data sources GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const json = await request.json();

    const validatedData = dataSourceSchema.parse(json);

    const { data: dataSource, error } = await supabase
      .from('data_sources')
      .insert([
        {
          name: validatedData.name,
          type: validatedData.type,
          instance_id: validatedData.instance_id,
          config: validatedData.config,
          status: 'not_synced',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating data source:', error);
      return NextResponse.json({ error: 'Failed to create data source' }, { status: 500 });
    }

    return NextResponse.json(dataSource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Error in data sources POST route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 