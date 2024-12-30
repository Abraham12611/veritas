'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Instance {
  id: string;
  name: string;
  environment: 'public' | 'private';
  dataSourcesCount: number;
  lastSynced: string;
  status: 'active' | 'syncing' | 'error';
}

interface InstancesTableProps {
  instances: Instance[];
  isLoading?: boolean;
}

export function InstancesTable({ instances, isLoading }: InstancesTableProps) {
  const router = useRouter();
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);

  const handleRowClick = (instanceId: string) => {
    setSelectedInstance(instanceId);
    router.push(`/instances/${instanceId}`);
  };

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

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Data Sources</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell className="animate-pulse bg-gray-700/20 h-4 w-32 rounded" />
                <TableCell className="animate-pulse bg-gray-700/20 h-4 w-24 rounded" />
                <TableCell className="animate-pulse bg-gray-700/20 h-4 w-16 rounded" />
                <TableCell className="animate-pulse bg-gray-700/20 h-4 w-28 rounded" />
                <TableCell className="animate-pulse bg-gray-700/20 h-4 w-20 rounded" />
                <TableCell className="animate-pulse bg-gray-700/20 h-4 w-24 rounded" />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Environment</TableHead>
            <TableHead>Data Sources</TableHead>
            <TableHead>Last Synced</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => (
            <TableRow
              key={instance.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(instance.id)}
            >
              <TableCell className="font-medium">{instance.name}</TableCell>
              <TableCell>
                <Badge variant={instance.environment === 'public' ? 'default' : 'secondary'}>
                  {instance.environment}
                </Badge>
              </TableCell>
              <TableCell>{instance.dataSourcesCount}</TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(instance.lastSynced), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(instance.status)}>
                  {instance.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/instances/${instance.id}/edit`);
                  }}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 