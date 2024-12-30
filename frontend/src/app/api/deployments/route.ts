import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const deploymentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['widget', 'slack', 'discord', 'api']),
  instance_id: z.string().uuid(),
  config: z.record(z.any()),
});

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: deployments, error } = await supabase
      .from('deployments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deployments:', error);
      return NextResponse.json({ error: 'Failed to fetch deployments' }, { status: 500 });
    }

    return NextResponse.json(deployments);
  } catch (error) {
    console.error('Error in deployments GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const json = await request.json();

    const validatedData = deploymentSchema.parse(json);

    const { data: deployment, error } = await supabase
      .from('deployments')
      .insert([
        {
          name: validatedData.name,
          type: validatedData.type,
          instance_id: validatedData.instance_id,
          config: validatedData.config,
          status: 'inactive',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating deployment:', error);
      return NextResponse.json({ error: 'Failed to create deployment' }, { status: 500 });
    }

    return NextResponse.json(deployment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Error in deployments POST route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 