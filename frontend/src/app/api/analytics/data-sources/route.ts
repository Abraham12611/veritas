import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing date range parameters' },
        { status: 400 }
      );
    }

    // Fetch data sources and their queries
    const { data: sources, error: sourcesError } = await supabase
      .from('data_sources')
      .select(`
        id,
        name,
        type,
        document_count,
        last_synced,
        queries (
          id,
          response_time,
          success,
          created_at
        )
      `)
      .eq('queries.created_at', `[${from},${to}]`);

    if (sourcesError) {
      console.error('Error fetching data sources:', sourcesError);
      return NextResponse.json(
        { error: 'Failed to fetch data sources' },
        { status: 500 }
      );
    }

    // Calculate total queries across all sources
    const totalQueries = sources.reduce(
      (sum, source) => sum + (source.queries?.length || 0),
      0
    );

    // Calculate metrics for each source
    const metrics = sources.map((source) => {
      const queries = source.queries || [];
      const queryCount = queries.length;
      const successfulQueries = queries.filter((q) => q.success).length;
      const totalResponseTime = queries.reduce(
        (sum, q) => sum + (q.response_time || 0),
        0
      );

      return {
        id: source.id,
        name: source.name,
        type: source.type,
        documentCount: source.document_count || 0,
        queryCount,
        avgResponseTime: queryCount > 0 ? totalResponseTime / queryCount : 0,
        successRate: queryCount > 0 ? (successfulQueries / queryCount) * 100 : 0,
        lastSynced: source.last_synced,
        percentageOfTotal: totalQueries > 0 ? (queryCount / totalQueries) * 100 : 0,
      };
    });

    // Sort by query count
    metrics.sort((a, b) => b.queryCount - a.queryCount);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error in data sources analytics route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 