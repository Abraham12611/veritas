import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { startOfDay, format } from 'date-fns';

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

    // Fetch all queries within the date range
    const { data: queries, error } = await supabase
      .from('queries')
      .select('created_at, response_time, success')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching queries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch queries' },
        { status: 500 }
      );
    }

    // Group queries by day and calculate metrics
    const dailyMetrics = queries.reduce((acc: Record<string, any>, query) => {
      const day = format(startOfDay(new Date(query.created_at)), 'yyyy-MM-dd');
      
      if (!acc[day]) {
        acc[day] = {
          date: day,
          queries: 0,
          totalResponseTime: 0,
          successfulQueries: 0,
        };
      }

      acc[day].queries += 1;
      acc[day].totalResponseTime += query.response_time || 0;
      if (query.success) {
        acc[day].successfulQueries += 1;
      }

      return acc;
    }, {});

    // Calculate averages and format data
    const dailyUsage = Object.values(dailyMetrics).map((day: any) => ({
      date: day.date,
      queries: day.queries,
      avgResponseTime: day.queries > 0 ? day.totalResponseTime / day.queries : 0,
      successRate: day.queries > 0 ? (day.successfulQueries / day.queries) * 100 : 0,
    }));

    return NextResponse.json(dailyUsage);
  } catch (error) {
    console.error('Error in daily usage route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 