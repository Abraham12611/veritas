'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const dataSourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  type: z.enum(['github', 'confluence', 'notion', 'slack', 'zendesk']),
  config: z.object({
    authToken: z.string().min(1, 'Auth token is required'),
    repositories: z.string().optional(),
    spaces: z.string().optional(),
    channels: z.string().optional(),
  }),
});

type DataSourceFormValues = z.infer<typeof dataSourceSchema>;

interface AddDataSourceStepProps {
  instanceId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface ApiError {
  error: string;
  details?: { message: string }[];
}

export function AddDataSourceStep({ instanceId, onComplete, onBack }: AddDataSourceStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceSchema),
    defaultValues: {
      name: '',
      type: 'github',
      config: {
        authToken: '',
        repositories: '',
        spaces: '',
        channels: '',
      },
    },
  });

  const onSubmit = async (values: DataSourceFormValues) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/instances/${instanceId}/data-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.details?.[0]?.message || error.error || 'Failed to create data source');
      }

      toast({
        title: 'Success',
        description: 'Data source added successfully',
      });

      onComplete();
    } catch (error) {
      console.error('Error creating data source:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create data source',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sourceType = form.watch('type');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Add Your First Data Source</h2>
        <p className="text-muted-foreground">
          Connect a data source to start ingesting and indexing your content.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Source Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Product Docs GitHub" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="confluence">Confluence</SelectItem>
                    <SelectItem value="notion">Notion</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="zendesk">Zendesk</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="config.authToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Token</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter your auth token" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {sourceType === 'github' && (
            <FormField
              control={form.control}
              name="config.repositories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repositories</FormLabel>
                  <FormControl>
                    <Input placeholder="owner/repo1, owner/repo2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {sourceType === 'confluence' && (
            <FormField
              control={form.control}
              name="config.spaces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spaces</FormLabel>
                  <FormControl>
                    <Input placeholder="space1, space2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {sourceType === 'slack' && (
            <FormField
              control={form.control}
              name="config.channels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channels</FormLabel>
                  <FormControl>
                    <Input placeholder="#channel1, #channel2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex justify-between gap-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Data Source'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 