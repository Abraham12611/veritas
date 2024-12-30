import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: dataSource, error } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching data source:', error);
      return NextResponse.json({ error: 'Failed to fetch data source' }, { status: 500 });
    }

    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    return NextResponse.json(dataSource);
  } catch (error) {
    console.error('Error in data source GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting data source:', error);
      return NextResponse.json({ error: 'Failed to delete data source' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Data source deleted successfully' });
  } catch (error) {
    console.error('Error in data source DELETE route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const json = await request.json();

    const { data: dataSource, error } = await supabase
      .from('data_sources')
      .update(json)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating data source:', error);
      return NextResponse.json({ error: 'Failed to update data source' }, { status: 500 });
    }

    return NextResponse.json(dataSource);
  } catch (error) {
    console.error('Error in data source PATCH route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 