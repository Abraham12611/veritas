import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: deployment, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching deployment:', error);
      return NextResponse.json({ error: 'Failed to fetch deployment' }, { status: 500 });
    }

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    return NextResponse.json(deployment);
  } catch (error) {
    console.error('Error in deployment GET route:', error);
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
      .from('deployments')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting deployment:', error);
      return NextResponse.json({ error: 'Failed to delete deployment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Deployment deleted successfully' });
  } catch (error) {
    console.error('Error in deployment DELETE route:', error);
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

    const { data: deployment, error } = await supabase
      .from('deployments')
      .update(json)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating deployment:', error);
      return NextResponse.json({ error: 'Failed to update deployment' }, { status: 500 });
    }

    return NextResponse.json(deployment);
  } catch (error) {
    console.error('Error in deployment PATCH route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 