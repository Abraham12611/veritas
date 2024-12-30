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

    // Fetch all queries within the date range
    const { data: queries, error } = await supabase
      .from('queries')
      .select(`
        id,
        query,
        response_time,
        success,
        created_at
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

    // Group queries by exact query text and calculate metrics
    const queryGroups = queries.reduce((acc: Record<string, any>, query) => {
      const text = query.query;
      
      if (!acc[text]) {
        acc[text] = {
          query: text,
          count: 0,
          totalResponseTime: 0,
          successfulQueries: 0,
          lastAsked: query.created_at,
        };
      }

      acc[text].count += 1;
      acc[text].totalResponseTime += query.response_time || 0;
      if (query.success) {
        acc[text].successfulQueries += 1;
      }
      if (new Date(query.created_at) > new Date(acc[text].lastAsked)) {
        acc[text].lastAsked = query.created_at;
      }

      return acc;
    }, {});

    // Format and sort by count
    const topQueries = Object.values(queryGroups)
      .map((group: any) => ({
        query: group.query,
        count: group.count,
        avgResponseTime: group.count > 0 ? group.totalResponseTime / group.count : 0,
        successRate: group.count > 0 ? (group.successfulQueries / group.count) * 100 : 0,
        lastAsked: group.lastAsked,
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10); // Get top 10 queries

    return NextResponse.json(topQueries);
  } catch (error) {
    console.error('Error in top queries route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 