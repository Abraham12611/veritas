'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Instance {
  id: string;
  name: string;
  environment: 'public' | 'private';
  status: 'active' | 'syncing' | 'error';
  description?: string;
}

interface InstanceHeaderProps {
  instance: Instance;
}

export function InstanceHeader({ instance }: InstanceHeaderProps) {
  const router = useRouter();

  const getStatusColor = (status: Instance['status']) => {
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

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/instances')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Instances
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">{instance.name}</h1>
            <Badge variant={instance.environment === 'public' ? 'default' : 'secondary'}>
              {instance.environment}
            </Badge>
            <Badge className={getStatusColor(instance.status)}>
              {instance.status}
            </Badge>
          </div>
          {instance.description && (
            <p className="mt-2 text-muted-foreground">{instance.description}</p>
          )}
        </div>
      </div>
    </div>
  );
} 