import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // First, get the current deployment status
    const { data: deployment, error: fetchError } = await supabase
      .from('deployments')
      .select('status, last_active')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      console.error('Error fetching deployment:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch deployment' }, { status: 500 });
    }

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Toggle the status
    const newStatus = deployment.status === 'active' ? 'inactive' : 'active';

    // TODO: Implement actual deployment logic based on type
    // This would typically involve:
    // 1. For widget: Generating and updating embed code
    // 2. For Slack: Managing bot installation/uninstallation
    // 3. For Discord: Managing bot connection
    // 4. For API: Managing API keys and access

    const { error: updateError } = await supabase
      .from('deployments')
      .update({
        status: newStatus,
        last_active: newStatus === 'active' ? new Date().toISOString() : deployment.last_active,
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating deployment:', updateError);
      return NextResponse.json({ error: 'Failed to update deployment' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Deployment ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      status: newStatus,
    });
  } catch (error) {
    console.error('Error in deployment toggle route:', error);

    // Update status to error if something goes wrong
    const supabase = createRouteHandlerClient({ cookies });
    await supabase
      .from('deployments')
      .update({ status: 'error' })
      .eq('id', params.id);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 