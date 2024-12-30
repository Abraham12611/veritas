'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Activity, Clock, Search, Zap } from 'lucide-react';

interface UsageMetrics {
  totalQueries: number;
  avgResponseTime: number;
  successRate: number;
  activeUsers: number;
}

interface DailyUsage {
  date: string;
  queries: number;
  avgResponseTime: number;
  successRate: number;
}

interface UsageAnalyticsProps {
  dateRange: DateRange;
}

export function UsageAnalytics({ dateRange }: UsageAnalyticsProps) {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
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

        const [metricsRes, dailyRes] = await Promise.all([
          fetch(`/api/analytics/metrics?${params}`),
          fetch(`/api/analytics/daily-usage?${params}`),
        ]);

        if (!metricsRes.ok || !dailyRes.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const [metricsData, dailyData] = await Promise.all([
          metricsRes.json(),
          dailyRes.json(),
        ]);

        setMetrics(metricsData);
        setDailyUsage(dailyData);
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatResponseTime = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatNumber(metrics?.totalQueries || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              During selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatResponseTime(metrics?.avgResponseTime || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${(metrics?.successRate || 0).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatNumber(metrics?.activeUsers || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique users
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Usage</CardTitle>
          <CardDescription>
            Query volume and performance metrics over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyUsage}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                  formatter={(value: number, name: string) => {
                    switch (name) {
                      case 'queries':
                        return [formatNumber(value), 'Queries'];
                      case 'avgResponseTime':
                        return [formatResponseTime(value), 'Avg Response Time'];
                      case 'successRate':
                        return [`${value.toFixed(1)}%`, 'Success Rate'];
                      default:
                        return [value, name];
                    }
                  }}
                />
                <Bar
                  dataKey="queries"
                  fill="#2563eb"
                  yAxisId="left"
                  name="Queries"
                />
                <Bar
                  dataKey="avgResponseTime"
                  fill="#16a34a"
                  yAxisId="right"
                  name="Avg Response Time"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 