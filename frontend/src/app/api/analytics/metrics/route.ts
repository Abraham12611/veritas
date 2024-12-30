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

    // Fetch metrics from queries table
    const { data: queryMetrics, error: queryError } = await supabase
      .from('queries')
      .select('id, response_time, success')
      .gte('created_at', from)
      .lte('created_at', to);

    if (queryError) {
      console.error('Error fetching query metrics:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }

    // Calculate metrics
    const totalQueries = queryMetrics.length;
    const avgResponseTime = totalQueries > 0
      ? queryMetrics.reduce((sum, q) => sum + (q.response_time || 0), 0) / totalQueries
      : 0;
    const successfulQueries = queryMetrics.filter(q => q.success).length;
    const successRate = totalQueries > 0
      ? (successfulQueries / totalQueries) * 100
      : 0;

    // Fetch unique users count
    const { count: activeUsers, error: userError } = await supabase
      .from('queries')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', from)
      .lte('created_at', to);

    if (userError) {
      console.error('Error fetching user metrics:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      totalQueries,
      avgResponseTime,
      successRate,
      activeUsers: activeUsers || 0,
    });
  } catch (error) {
    console.error('Error in metrics route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 