import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { instanceId: string; sourceId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user has access to this instance and data source
    const { data: dataSource, error: dataSourceError } = await supabase
      .from('data_sources')
      .select('id, instance_id')
      .eq('id', params.sourceId)
      .eq('instance_id', params.instanceId)
      .single();

    if (dataSourceError || !dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Delete data source
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', params.sourceId);

    if (error) {
      console.error('Error deleting data source:', error);
      return NextResponse.json(
        { error: 'Failed to delete data source' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete data source route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { instanceId: string; sourceId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user has access to this instance and data source
    const { data: dataSource, error: dataSourceError } = await supabase
      .from('data_sources')
      .select('id, instance_id, type, config')
      .eq('id', params.sourceId)
      .eq('instance_id', params.instanceId)
      .single();

    if (dataSourceError || !dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Update status to syncing
    const { error: updateError } = await supabase
      .from('data_sources')
      .update({
        status: 'syncing',
        last_synced: new Date().toISOString(),
      })
      .eq('id', params.sourceId);

    if (updateError) {
      console.error('Error updating data source status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update data source status' },
        { status: 500 }
      );
    }

    // TODO: Trigger sync in background
    // This would typically be handled by a background job/queue
    // For now, we'll just return success

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in sync data source route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 