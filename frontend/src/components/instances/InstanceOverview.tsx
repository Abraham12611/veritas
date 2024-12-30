'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { AnalyticsPreview } from '@/components/dashboard/AnalyticsPreview';
import { Activity, MessageSquare, Database, Clock } from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  environment: 'public' | 'private';
  status: 'active' | 'syncing' | 'error';
  description?: string;
}

interface InstanceOverviewProps {
  instance: Instance;
}

export function InstanceOverview({ instance }: InstanceOverviewProps) {
  // TODO: Fetch these stats from the API
  const stats = {
    totalQueries: 1234,
    avgResponseTime: '1.2s',
    dataSources: 5,
    lastSync: '2 hours ago',
    queryTrend: 15,
    chartData: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      queries: Math.floor(Math.random() * 100),
    })),
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Queries"
          value={stats.totalQueries}
          icon={MessageSquare}
          trend={{ value: stats.queryTrend, isPositive: true }}
        />
        <KpiCard
          title="Avg Response Time"
          value={stats.avgResponseTime}
          icon={Clock}
        />
        <KpiCard
          title="Data Sources"
          value={stats.dataSources}
          icon={Database}
        />
        <KpiCard
          title="Last Synced"
          value={stats.lastSync}
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsPreview data={stats.chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TODO: Add list of common questions */}
            <p className="text-muted-foreground">Loading common questions...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 