'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsageAnalytics } from '@/components/analytics/UsageAnalytics';
import { QueriesAnalytics } from '@/components/analytics/QueriesAnalytics';
import { DataSourcesAnalytics } from '@/components/analytics/DataSourcesAnalytics';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { addDays } from 'date-fns';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  return (
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor usage, track performance, and gain insights into your Veritas instances.
          </p>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usage">Usage & Performance</TabsTrigger>
          <TabsTrigger value="queries">Common Questions</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          <UsageAnalytics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="queries" className="space-y-6">
          <QueriesAnalytics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <DataSourcesAnalytics dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 