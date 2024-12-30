'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Activity, MessageSquare, Database, Clock, Users, Server } from 'lucide-react';

const ICONS = {
  activity: Activity,
  message: MessageSquare,
  database: Database,
  clock: Clock,
  users: Users,
  server: Server,
} as const;

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  iconType?: keyof typeof ICONS;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function KpiCard({ title, value, description, iconType, trend }: KpiCardProps) {
  const Icon = iconType ? ICONS[iconType] : null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
          {trend && (
            <div className={`flex items-center text-sm ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <span>{trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 