'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Trash2, Github, BookOpen, FileText, MessageSquare, HelpCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AddDataSourceModal } from './AddDataSourceModal';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface DataSource {
  id: string;
  name: string;
  type: 'github' | 'confluence' | 'notion' | 'slack' | 'zendesk';
  status: 'active' | 'syncing' | 'error';
  lastSynced: string;
  documentCount: number;
}

interface InstanceDataSourcesProps {
  instanceId: string;
}

export function InstanceDataSources({ instanceId }: InstanceDataSourcesProps) {
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDataSources = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/instances/${instanceId}/data-sources`);
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

  useEffect(() => {
    fetchDataSources();
  }, [instanceId]);

  const handleSync = async (sourceId: string) => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/data-sources/${sourceId}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }

      toast({
        title: 'Sync started',
        description: 'The data source sync has been initiated.',
      });

      // Refresh the data sources list
      fetchDataSources();
    } catch (error) {
      console.error('Error syncing data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync data source. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (sourceId: string) => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/data-sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete data source');
      }

      toast({
        title: 'Data source removed',
        description: 'The data source has been successfully removed.',
      });

      // Refresh the data sources list
      fetchDataSources();
    } catch (error) {
      console.error('Error deleting data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove data source. Please try again.',
        variant: 'destructive',
      });
    }
  };

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
    switch (type) {
      case 'github':
        return <Github className="h-5 w-5" />;
      case 'confluence':
        return <BookOpen className="h-5 w-5" />;
      case 'notion':
        return <FileText className="h-5 w-5" />;
      case 'slack':
        return <MessageSquare className="h-5 w-5" />;
      case 'zendesk':
        return <HelpCircle className="h-5 w-5" />;
      default:
        return null;
    }
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
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground text-center">
                Loading data sources...
              </p>
            </CardContent>
          </Card>
        ) : dataSources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground text-center">
                No data sources connected yet. Click "Add Data Source" to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          dataSources.map((source) => (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(source.id)}
                      disabled={source.status === 'syncing'}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {source.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Data Source</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this data source? This will delete all indexed documents and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(source.id)}
                            className="bg-red-500 text-white hover:bg-red-600"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddDataSourceModal
        instanceId={instanceId}
        isOpen={isAddingSource}
        onClose={() => setIsAddingSource(false)}
        onSuccess={fetchDataSources}
      />
    </div>
  );
} 