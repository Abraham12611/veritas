'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DataSource {
  id: string;
  name: string;
  type: 'github' | 'confluence' | 'notion' | 'slack';
  status: 'active' | 'syncing' | 'error';
  lastSynced: string;
  documentCount: number;
}

interface InstanceDataSourcesProps {
  instanceId: string;
}

export function InstanceDataSources({ instanceId }: InstanceDataSourcesProps) {
  const [isAddingSource, setIsAddingSource] = useState(false);

  // TODO: Fetch data sources from API
  const dataSources: DataSource[] = [
    {
      id: '1',
      name: 'Product Documentation',
      type: 'github',
      status: 'active',
      lastSynced: new Date().toISOString(),
      documentCount: 156,
    },
    {
      id: '2',
      name: 'Internal Wiki',
      type: 'confluence',
      status: 'syncing',
      lastSynced: new Date().toISOString(),
      documentCount: 89,
    },
  ];

  const getStatusColor = (status: DataSource['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'syncing':
        return 'bg-blue-500/10 text-blue-500';
      case 'error':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getSourceIcon = (type: DataSource['type']) => {
    // TODO: Add icons for each source type
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Sources</h2>
          <p className="text-muted-foreground mt-1">
            Manage the data sources connected to this instance.
          </p>
        </div>
        <Button onClick={() => setIsAddingSource(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Data Source
        </Button>
      </div>

      <div className="grid gap-6">
        {dataSources.map((source) => (
          <Card key={source.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getSourceIcon(source.type)}
                  <div>
                    <CardTitle>{source.name}</CardTitle>
                    <CardDescription>
                      {source.type.charAt(0).toUpperCase() + source.type.slice(1)}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(source.status)}>
                  {source.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    Last synced {formatDistanceToNow(new Date(source.lastSynced), { addSuffix: true })}
                  </p>
                  <p className="text-muted-foreground">
                    {source.documentCount} documents indexed
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {dataSources.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground text-center">
                No data sources connected yet. Click "Add Data Source" to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* TODO: Add data source modal */}
      {isAddingSource && (
        <div>
          {/* Add your modal component here */}
        </div>
      )}
    </div>
  );
} 