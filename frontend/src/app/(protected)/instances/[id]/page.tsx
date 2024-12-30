import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstanceOverview } from '@/components/instances/InstanceOverview';
import { InstanceDataSources } from '@/components/instances/InstanceDataSources';
import { InstanceDeployment } from '@/components/instances/InstanceDeployment';
import { InstanceSettings } from '@/components/instances/InstanceSettings';
import { InstanceHeader } from '@/components/instances/InstanceHeader';

interface InstanceDetailsPageProps {
  params: {
    id: string;
  };
}

async function getInstance(id: string) {
  // TODO: Fetch instance details from API
  // For now, return mock data
  return {
    id,
    name: 'Example Instance',
    environment: 'public' as const,
    dataSourcesCount: 3,
    lastSynced: new Date().toISOString(),
    status: 'active' as const,
    description: 'This is an example instance.',
  };
}

export default async function InstanceDetailsPage({ params }: InstanceDetailsPageProps) {
  const instance = await getInstance(params.id);

  if (!instance) {
    notFound();
  }

  return (
    <div className="space-y-8 p-8">
      <InstanceHeader instance={instance} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <InstanceOverview instance={instance} />
        </TabsContent>

        <TabsContent value="data-sources" className="space-y-4">
          <InstanceDataSources instanceId={instance.id} />
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4">
          <InstanceDeployment instanceId={instance.id} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <InstanceSettings instance={instance} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 