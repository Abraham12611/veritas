import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const deploymentSchema = z.object({
  type: z.enum(['website_widget', 'slack_bot', 'discord_bot', 'api']),
  config: z.object({
    // Common fields
    name: z.string().min(3),
    enabled: z.boolean(),
    
    // Website Widget specific
    widgetTitle: z.string().optional(),
    theme: z.enum(['light', 'dark']).optional(),
    position: z.enum(['bottom-right', 'bottom-left']).optional(),
    
    // Slack specific
    workspaceId: z.string().optional(),
    channelIds: z.array(z.string()).optional(),
    
    // Discord specific
    serverId: z.string().optional(),
    
    // API specific
    apiKey: z.string().optional(),
    allowedOrigins: z.array(z.string()).optional(),
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

    // Fetch deployments
    const { data: deployments, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('instance_id', params.instanceId);

    if (error) {
      console.error('Error fetching deployments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deployments' },
        { status: 500 }
      );
    }

    return NextResponse.json(deployments);
  } catch (error) {
    console.error('Error in deployments route:', error);
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
    const validatedData = deploymentSchema.parse(json);

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

    // Check if deployment already exists
    const { data: existingDeployment } = await supabase
      .from('deployments')
      .select('id')
      .eq('instance_id', params.instanceId)
      .eq('deployment_type', validatedData.type)
      .single();

    if (existingDeployment) {
      // Update existing deployment
      const { data, error } = await supabase
        .from('deployments')
        .update({
          config_json: validatedData.config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDeployment.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating deployment:', error);
        return NextResponse.json(
          { error: 'Failed to update deployment' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } else {
      // Create new deployment
      const { data, error } = await supabase
        .from('deployments')
        .insert({
          instance_id: params.instanceId,
          deployment_type: validatedData.type,
          config_json: validatedData.config,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating deployment:', error);
        return NextResponse.json(
          { error: 'Failed to create deployment' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in create deployment route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 