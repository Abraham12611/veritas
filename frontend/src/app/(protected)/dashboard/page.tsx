'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { AnalyticsPreview } from '@/components/dashboard/AnalyticsPreview';
import { InstancesTable } from '@/components/dashboard/InstancesTable';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { createClient } from '@/lib/supabase/client';

interface Instance {
  id: string;
  name: string;
  environment: 'public' | 'private';
  dataSourcesCount: number;
  lastSynced: string;
  status: 'active' | 'syncing' | 'error';
}

interface Analytics {
  totalQueries: number;
  activeInstances: number;
  dataSources: number;
  queryTrend: number;
  chartData: Array<{
    date: string;
    queries: number;
  }>;
}

export default function DashboardPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalQueries: 0,
    activeInstances: 0,
    dataSources: 0,
    queryTrend: 0,
    chartData: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        
        // Fetch instances
        const { data: instancesData, error: instancesError } = await supabase
          .from('instances')
          .select('*');

        if (instancesError) throw instancesError;

        // Transform the data to match the expected format
        const transformedInstances: Instance[] = (instancesData || []).map(instance => ({
          id: instance.id,
          name: instance.name,
          environment: instance.is_public ? 'public' : 'private',
          dataSourcesCount: instance.data_sources_count || 0,
          lastSynced: instance.last_synced || new Date().toISOString(),
          status: instance.status || 'active'
        }));

        setInstances(transformedInstances);

        // For now, use mock analytics data
        setAnalytics({
          totalQueries: 1234,
          activeInstances: transformedInstances.length,
          dataSources: 12,
          queryTrend: 15,
          chartData: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
            queries: Math.floor(Math.random() * 100),
          })),
        });

        setShowOnboarding(transformedInstances.length === 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button>Add New Instance</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Queries"
          value={analytics.totalQueries}
          iconType="activity"
          trend={{ value: analytics.queryTrend, isPositive: true }}
        />
        <KpiCard
          title="Active Instances"
          value={analytics.activeInstances}
          iconType="server"
        />
        <KpiCard
          title="Data Sources"
          value={analytics.dataSources}
          iconType="database"
        />
        <KpiCard
          title="Active Users"
          value="250+"
          iconType="users"
          description="Last 30 days"
        />
      </div>

      <AnalyticsPreview data={analytics.chartData} />

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Instances</h2>
        </div>
        <InstancesTable instances={instances} />
      </div>

      {showOnboarding && (
        <OnboardingWizard
          isOpen={true}
          onClose={handleCloseOnboarding}
        />
      )}
    </div>
  );
} 