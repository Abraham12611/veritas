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

    // Fetch queries with their patterns
    const { data: queries, error } = await supabase
      .from('queries')
      .select(`
        id,
        query,
        pattern,
        response_time,
        success
      `)
      .gte('created_at', from)
      .lte('created_at', to);

    if (error) {
      console.error('Error fetching queries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch queries' },
        { status: 500 }
      );
    }

    // Group queries by pattern and calculate metrics
    const patternGroups = queries.reduce((acc: Record<string, any>, query) => {
      const pattern = query.pattern || 'Other';
      
      if (!acc[pattern]) {
        acc[pattern] = {
          pattern,
          count: 0,
          totalResponseTime: 0,
          successfulQueries: 0,
          examples: new Set(),
        };
      }

      acc[pattern].count += 1;
      acc[pattern].totalResponseTime += query.response_time || 0;
      if (query.success) {
        acc[pattern].successfulQueries += 1;
      }
      if (acc[pattern].examples.size < 3) {
        acc[pattern].examples.add(query.query);
      }

      return acc;
    }, {});

    // Calculate percentages and format data
    const totalQueries = queries.length;
    const patterns = Object.values(patternGroups)
      .map((group: any) => ({
        pattern: group.pattern,
        count: group.count,
        percentage: (group.count / totalQueries) * 100,
        avgResponseTime: group.count > 0 ? group.totalResponseTime / group.count : 0,
        successRate: group.count > 0 ? (group.successfulQueries / group.count) * 100 : 0,
        examples: Array.from(group.examples),
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10); // Get top 10 patterns

    return NextResponse.json(patterns);
  } catch (error) {
    console.error('Error in query patterns route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 