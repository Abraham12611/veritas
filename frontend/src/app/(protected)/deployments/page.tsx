'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Globe, MessageSquare, Bot, Code } from 'lucide-react';

const deploymentTypes = [
  { id: 'widget', name: 'Website Widget', description: 'Embed a chat widget on your website', icon: Globe },
  { id: 'slack', name: 'Slack Bot', description: 'Deploy a bot to your Slack workspace', icon: MessageSquare },
  { id: 'discord', name: 'Discord Bot', description: 'Add a bot to your Discord server', icon: Bot },
  { id: 'api', name: 'API Integration', description: 'Access via REST API endpoints', icon: Code },
];

interface Deployment {
  id: string;
  name: string;
  type: string;
  instance: string;
  status: 'active' | 'inactive' | 'error';
  lastActive: string;
  config: Record<string, any>;
}

function DeploymentCard({ deployment }: { deployment: Deployment }) {
  const { toast } = useToast();

  const handleToggle = async () => {
    try {
      const response = await fetch(`/api/deployments/${deployment.id}/toggle`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle deployment');
      }

      toast({
        title: `Deployment ${deployment.status === 'active' ? 'deactivated' : 'activated'}`,
        description: `The deployment has been ${deployment.status === 'active' ? 'deactivated' : 'activated'} successfully.`,
      });
    } catch (error) {
      console.error('Error toggling deployment:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle deployment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async () => {
    try {
      const response = await fetch(`/api/deployments/${deployment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove deployment');
      }

      toast({
        title: 'Deployment removed',
        description: 'The deployment has been removed successfully.',
      });
    } catch (error) {
      console.error('Error removing deployment:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove deployment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{deployment.name}</h3>
            <p className="text-muted-foreground text-sm mt-1">Connected to {deployment.instance}</p>
          </div>
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            deployment.status === 'active' ? 'bg-green-100 text-green-800' :
            deployment.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }`}>
            {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{deployment.type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Active</p>
            <p className="font-medium">{deployment.lastActive}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="link" className="text-primary">
            View Details
          </Button>
          <span className="text-muted-foreground">•</span>
          <Button variant="link" className="text-primary" onClick={handleToggle}>
            {deployment.status === 'active' ? 'Deactivate' : 'Activate'}
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

export default function DeploymentsPage() {
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDeployments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/deployments');
      if (!response.ok) {
        throw new Error('Failed to fetch deployments');
      }
      const data = await response.json();
      setDeployments(data);
    } catch (error) {
      console.error('Error fetching deployments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deployments. Please try again.',
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
          <h1 className="text-2xl font-bold">Deployments</h1>
          <p className="text-muted-foreground mt-1">Manage your deployment configurations</p>
        </div>
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
      ) : deployments.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">No deployments found. Configure one to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {deployments.map((deployment) => (
            <DeploymentCard key={deployment.id} deployment={deployment} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Deployments</CardTitle>
          <CardDescription>Choose how to deploy your Veritas instance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {deploymentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setShowConfigureModal(true)}
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

      {/* TODO: Add ConfigureDeploymentModal component */}
      {showConfigureModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Configure Deployment</CardTitle>
              <CardDescription>Set up your deployment configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Add form fields */}
              <Button onClick={() => setShowConfigureModal(false)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 