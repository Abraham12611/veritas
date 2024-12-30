'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Github, BookOpen, FileText, MessageSquare, HelpCircle } from 'lucide-react';

const dataSourceTypes = [
  { id: 'github', name: 'GitHub', description: 'Connect your GitHub repositories', icon: Github },
  { id: 'confluence', name: 'Confluence', description: 'Import Confluence spaces and pages', icon: BookOpen },
  { id: 'notion', name: 'Notion', description: 'Sync Notion workspaces and databases', icon: FileText },
  { id: 'slack', name: 'Slack', description: 'Index Slack channels and threads', icon: MessageSquare },
  { id: 'zendesk', name: 'Zendesk', description: 'Import Zendesk tickets and articles', icon: HelpCircle },
];

interface DataSource {
  id: string;
  name: string;
  type: string;
  instance: string;
  lastSynced: string;
  status: 'synced' | 'syncing' | 'failed';
  documentsCount: number;
  nextSync: string;
}

function DataSourceCard({ source }: { source: DataSource }) {
  const { toast } = useToast();

  const handleSync = async () => {
    try {
      const response = await fetch(`/api/data-sources/${source.id}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sync data source');
      }

      toast({
        title: 'Sync started',
        description: 'The data source sync has been initiated.',
      });
    } catch (error) {
      console.error('Error syncing data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync data source. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async () => {
    try {
      const response = await fetch(`/api/data-sources/${source.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove data source');
      }

      toast({
        title: 'Data source removed',
        description: 'The data source has been removed successfully.',
      });
    } catch (error) {
      console.error('Error removing data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove data source. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{source.name}</h3>
            <p className="text-muted-foreground text-sm mt-1">Connected to {source.instance}</p>
          </div>
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            source.status === 'synced' ? 'bg-green-100 text-green-800' :
            source.status === 'syncing' ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'
          }`}>
            {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{source.type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Documents</p>
            <p className="font-medium">{source.documentsCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Synced</p>
            <p className="font-medium">{source.lastSynced}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Next Sync</p>
            <p className="font-medium">{source.nextSync}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="link" className="text-primary">
            View Details
          </Button>
          <span className="text-muted-foreground">•</span>
          <Button variant="link" className="text-primary" onClick={handleSync}>
            Sync Now
          </Button>
          <span className="text-muted-foreground">•</span>
          <Button variant="link" className="text-destructive" onClick={handleRemove}>
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DataSourcesPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDataSources = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/data-sources');
      if (!response.ok) {
        throw new Error('Failed to fetch data sources');
      }
      const data = await response.json();
      setDataSources(data);
    } catch (error) {
      console.error('Error fetching data sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data sources. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Data Sources</h1>
          <p className="text-muted-foreground mt-1">Manage your connected knowledge sources</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          Add Data Source
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dataSources.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">No data sources found. Add one to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dataSources.map((source) => (
            <DataSourceCard key={source.id} source={source} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Data Sources</CardTitle>
          <CardDescription>Connect more knowledge sources to enhance your instances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataSourceTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setShowAddModal(true)}
                  className="flex items-start p-4 rounded-md border hover:border-primary transition-colors text-left"
                >
                  <div className="flex gap-3">
                    <div className="mt-1">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{type.name}</h3>
                      <p className="text-muted-foreground text-sm mt-1">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* TODO: Add DataSourceModal component */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Data Source</CardTitle>
              <CardDescription>Connect a new knowledge source to your instance</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Add form fields */}
              <Button onClick={() => setShowAddModal(false)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 