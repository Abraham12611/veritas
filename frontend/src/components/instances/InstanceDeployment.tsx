'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, MessageSquare, Bot, Code } from 'lucide-react';

interface InstanceDeploymentProps {
  instanceId: string;
}

export function InstanceDeployment({ instanceId }: InstanceDeploymentProps) {
  const deploymentOptions = [
    {
      id: 'website-widget',
      title: 'Website Widget',
      description: 'Embed an AI assistant widget on your website or documentation.',
      icon: Globe,
      status: 'not_configured',
    },
    {
      id: 'slack-bot',
      title: 'Slack Bot',
      description: 'Add Veritas to your Slack workspace for instant answers.',
      icon: MessageSquare,
      status: 'not_configured',
    },
    {
      id: 'discord-bot',
      title: 'Discord Bot',
      description: 'Deploy Veritas in your Discord server for community support.',
      icon: Bot,
      status: 'not_configured',
    },
    {
      id: 'api',
      title: 'API Integration',
      description: 'Access Veritas programmatically via REST API.',
      icon: Code,
      status: 'not_configured',
    },
  ];

  const handleConfigure = (deploymentId: string) => {
    // TODO: Handle deployment configuration
    console.log('Configuring deployment:', deploymentId);
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
        {deploymentOptions.map((option) => (
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
            <CardContent>
              <Button
                variant={option.status === 'configured' ? 'outline' : 'default'}
                className="w-full"
                onClick={() => handleConfigure(option.id)}
              >
                {option.status === 'configured' ? 'Manage' : 'Configure'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TODO: Add configuration modals for each deployment type */}
    </div>
  );
} 