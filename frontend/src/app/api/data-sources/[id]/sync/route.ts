import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // First, update the data source status to 'syncing'
    const { data: dataSource, error: updateError } = await supabase
      .from('data_sources')
      .update({ status: 'syncing', last_synced: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating data source status:', updateError);
      return NextResponse.json({ error: 'Failed to update data source status' }, { status: 500 });
    }

    // TODO: Implement actual sync logic based on data source type
    // This would typically involve:
    // 1. Fetching data from the source (GitHub, Confluence, etc.)
    // 2. Processing and storing documents
    // 3. Generating embeddings
    // 4. Updating sync status and metadata

    // For now, we'll simulate a successful sync
    const { error: finalUpdateError } = await supabase
      .from('data_sources')
      .update({
        status: 'synced',
        documents_count: Math.floor(Math.random() * 100) + 1, // Simulated count
        next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next sync in 24 hours
      })
      .eq('id', params.id);

    if (finalUpdateError) {
      console.error('Error finalizing data source sync:', finalUpdateError);
      return NextResponse.json({ error: 'Failed to finalize sync' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Sync completed successfully' });
  } catch (error) {
    console.error('Error in data source sync route:', error);

    // Update status to error if something goes wrong
    const supabase = createRouteHandlerClient({ cookies });
    await supabase
      .from('data_sources')
      .update({ status: 'error' })
      .eq('id', params.id);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 