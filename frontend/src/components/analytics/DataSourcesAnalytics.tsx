'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { Github, BookOpen, FileText, MessageSquare, HelpCircle } from 'lucide-react';

interface DataSourceMetrics {
  id: string;
  name: string;
  type: 'github' | 'confluence' | 'notion' | 'slack' | 'zendesk';
  documentCount: number;
  queryCount: number;
  avgResponseTime: number;
  successRate: number;
  lastSynced: string;
  percentageOfTotal: number;
}

interface DataSourcesAnalyticsProps {
  dateRange: DateRange;
}

const COLORS = ['#2563eb', '#16a34a', '#eab308', '#dc2626', '#9333ea'];

const TYPE_ICONS = {
  github: Github,
  confluence: BookOpen,
  notion: FileText,
  slack: MessageSquare,
  zendesk: HelpCircle,
};

export function DataSourcesAnalytics({ dateRange }: DataSourcesAnalyticsProps) {
  const [metrics, setMetrics] = useState<DataSourceMetrics[]>([]);
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

        const response = await fetch(`/api/analytics/data-sources?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const data = await response.json();
        setMetrics(data);
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

  const pieChartData = metrics.map((source) => ({
    name: source.name,
    value: source.queryCount,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Source Distribution</CardTitle>
            <CardDescription>
              Query distribution across different data sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Loading chart...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        formatNumber(value),
                        'Queries',
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="md:col-span-2">
            <CardContent className="flex items-center justify-center py-6">
              <p className="text-sm text-muted-foreground">Loading metrics...</p>
            </CardContent>
          </Card>
        ) : metrics.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="flex items-center justify-center py-6">
              <p className="text-sm text-muted-foreground">No data sources found for the selected period.</p>
            </CardContent>
          </Card>
        ) : (
          metrics.map((source) => {
            const Icon = TYPE_ICONS[source.type];
            return (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                        <CardDescription>
                          {source.type.charAt(0).toUpperCase() + source.type.slice(1)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {source.percentageOfTotal.toFixed(1)}% of queries
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={source.percentageOfTotal} className="h-2" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Documents</p>
                        <p className="text-lg font-medium">
                          {formatNumber(source.documentCount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Queries</p>
                        <p className="text-lg font-medium">
                          {formatNumber(source.queryCount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Response Time</p>
                        <p className="text-lg font-medium">
                          {formatResponseTime(source.avgResponseTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-lg font-medium">
                          {source.successRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Synced</p>
                      <p className="text-sm">
                        {format(new Date(source.lastSynced), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
} 