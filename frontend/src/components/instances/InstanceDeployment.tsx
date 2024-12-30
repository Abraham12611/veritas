'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, MessageSquare, Bot, Code } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ConfigureDeploymentModal } from './deployment/ConfigureDeploymentModal';

interface Deployment {
  id: string;
  deployment_type: 'website_widget' | 'slack_bot' | 'discord_bot' | 'api';
  config_json: {
    name: string;
    enabled: boolean;
    widgetTitle?: string;
    theme?: 'light' | 'dark';
    position?: 'bottom-right' | 'bottom-left';
    workspaceId?: string;
    channelIds?: string[];
    serverId?: string;
    apiKey?: string;
    allowedOrigins?: string[];
  };
  created_at: string;
  updated_at: string;
}

interface InstanceDeploymentProps {
  instanceId: string;
}

export function InstanceDeployment({ instanceId }: InstanceDeploymentProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState<{
    type: Deployment['deployment_type'];
    config?: Deployment['config_json'];
  } | null>(null);
  const { toast } = useToast();

  const deploymentOptions = [
    {
      id: 'website_widget',
      title: 'Website Widget',
      description: 'Embed an AI assistant widget on your website or documentation.',
      icon: Globe,
    },
    {
      id: 'slack_bot',
      title: 'Slack Bot',
      description: 'Add Veritas to your Slack workspace for instant answers.',
      icon: MessageSquare,
    },
    {
      id: 'discord_bot',
      title: 'Discord Bot',
      description: 'Deploy Veritas in your Discord server for community support.',
      icon: Bot,
    },
    {
      id: 'api',
      title: 'API Integration',
      description: 'Access Veritas programmatically via REST API.',
      icon: Code,
    },
  ] as const;

  const fetchDeployments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/instances/${instanceId}/deployments`);
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

  useEffect(() => {
    fetchDeployments();
  }, [instanceId]);

  const handleConfigure = (deploymentType: Deployment['deployment_type']) => {
    const existingDeployment = deployments.find(
      (d) => d.deployment_type === deploymentType
    );
    setSelectedDeployment({
      type: deploymentType,
      config: existingDeployment?.config_json,
    });
  };

  const getDeploymentStatus = (deploymentType: Deployment['deployment_type']) => {
    const deployment = deployments.find(
      (d) => d.deployment_type === deploymentType
    );
    return deployment?.config_json.enabled ? 'configured' : 'not_configured';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Deployments</h2>
        <p className="text-muted-foreground mt-1">
          Configure how users can interact with this Veritas instance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {deploymentOptions.map((option) => {
          const status = getDeploymentStatus(option.id as Deployment['deployment_type']);
          return (
            <Card key={option.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <option.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{option.title}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {status === 'configured' && (
                  <Badge variant="outline" className="mb-4">
                    Configured
                  </Badge>
                )}
                <Button
                  variant={status === 'configured' ? 'outline' : 'default'}
                  className="w-full"
                  onClick={() => handleConfigure(option.id as Deployment['deployment_type'])}
                >
                  {status === 'configured' ? 'Manage' : 'Configure'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedDeployment && (
        <ConfigureDeploymentModal
          instanceId={instanceId}
          deploymentType={selectedDeployment.type}
          isOpen={true}
          onClose={() => setSelectedDeployment(null)}
          onSuccess={() => {
            fetchDeployments();
            setSelectedDeployment(null);
          }}
          existingConfig={selectedDeployment.config}
        />
      )}
    </div>
  );
} 