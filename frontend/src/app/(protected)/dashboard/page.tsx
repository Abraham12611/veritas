import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { AnalyticsPreview } from '@/components/dashboard/AnalyticsPreview';
import { InstancesTable } from '@/components/dashboard/InstancesTable';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Users, Database, Activity, Server } from 'lucide-react';

async function getInstances() {
  // TODO: Fetch instances from API
  return [];
}

async function getAnalytics() {
  // TODO: Fetch analytics data from API
  return {
    totalQueries: 1234,
    activeInstances: 5,
    dataSources: 12,
    queryTrend: 15,
    chartData: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      queries: Math.floor(Math.random() * 100),
    })),
  };
}

export default async function DashboardPage() {
  const instances = await getInstances();
  const analytics = await getAnalytics();

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
          icon={Activity}
          trend={{ value: analytics.queryTrend, isPositive: true }}
        />
        <KpiCard
          title="Active Instances"
          value={analytics.activeInstances}
          icon={Server}
        />
        <KpiCard
          title="Data Sources"
          value={analytics.dataSources}
          icon={Database}
        />
        <KpiCard
          title="Active Users"
          value="250+"
          icon={Users}
          description="Last 30 days"
        />
      </div>

      <Suspense fallback={<div>Loading chart...</div>}>
        <AnalyticsPreview data={analytics.chartData} />
      </Suspense>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Instances</h2>
        </div>
        <Suspense fallback={<InstancesTable instances={[]} isLoading />}>
          <InstancesTable instances={instances} />
        </Suspense>
      </div>

      {instances.length === 0 && (
        <OnboardingWizard
          isOpen={true}
          onClose={() => {
            // TODO: Handle close
          }}
        />
      )}
    </div>
  );
} 