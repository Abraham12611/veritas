'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface QueryPattern {
  pattern: string;
  count: number;
  percentage: number;
  examples: string[];
  avgResponseTime: number;
  successRate: number;
}

interface TopQuery {
  query: string;
  count: number;
  lastAsked: string;
  avgResponseTime: number;
  successRate: number;
}

interface QueriesAnalyticsProps {
  dateRange: DateRange;
}

export function QueriesAnalytics({ dateRange }: QueriesAnalyticsProps) {
  const [patterns, setPatterns] = useState<QueryPattern[]>([]);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          from: dateRange.from?.toISOString() || '',
          to: dateRange.to?.toISOString() || '',
        });

        const [patternsRes, queriesRes] = await Promise.all([
          fetch(`/api/analytics/query-patterns?${params}`),
          fetch(`/api/analytics/top-queries?${params}`),
        ]);

        if (!patternsRes.ok || !queriesRes.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const [patternsData, queriesData] = await Promise.all([
          patternsRes.json(),
          queriesRes.json(),
        ]);

        setPatterns(patternsData);
        setTopQueries(queriesData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load analytics data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (dateRange.from && dateRange.to) {
      fetchAnalytics();
    }
  }, [dateRange, toast]);

  const formatResponseTime = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="patterns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="patterns">Query Patterns</TabsTrigger>
          <TabsTrigger value="top">Top Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns">
          <div className="grid gap-6">
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground">Loading patterns...</p>
                </CardContent>
              </Card>
            ) : patterns.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground">No patterns found for the selected period.</p>
                </CardContent>
              </Card>
            ) : (
              patterns.map((pattern, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pattern.pattern}</CardTitle>
                      <Badge variant="secondary">
                        {pattern.count} queries ({pattern.percentage.toFixed(1)}%)
                      </Badge>
                    </div>
                    <CardDescription>
                      Avg. Response Time: {formatResponseTime(pattern.avgResponseTime)} |{' '}
                      Success Rate: {pattern.successRate.toFixed(1)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Progress value={pattern.percentage} className="h-2" />
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Example Queries:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {pattern.examples.map((example, i) => (
                            <li key={i}>• {example}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="top">
          <div className="grid gap-6">
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground">Loading queries...</p>
                </CardContent>
              </Card>
            ) : topQueries.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground">No queries found for the selected period.</p>
                </CardContent>
              </Card>
            ) : (
              topQueries.map((query, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{query.query}</CardTitle>
                      <Badge variant="secondary">
                        {query.count} times
                      </Badge>
                    </div>
                    <CardDescription>
                      Last asked: {format(new Date(query.lastAsked), 'MMM d, yyyy HH:mm')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Response Time</p>
                        <p className="text-lg font-medium">
                          {formatResponseTime(query.avgResponseTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-lg font-medium">
                          {query.successRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 