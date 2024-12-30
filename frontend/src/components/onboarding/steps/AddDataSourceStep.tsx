'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const dataSourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  type: z.enum(['github', 'confluence', 'notion', 'slack']),
  authToken: z.string().min(1, 'Auth token is required'),
});

type DataSourceFormValues = z.infer<typeof dataSourceSchema>;

interface AddDataSourceStepProps {
  instanceId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function AddDataSourceStep({ instanceId, onComplete, onBack }: AddDataSourceStepProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceSchema),
    defaultValues: {
      name: '',
      type: 'github',
      authToken: '',
    },
  });

  const onSubmit = async (values: DataSourceFormValues) => {
    try {
      setIsLoading(true);
      // TODO: Call API to create data source
      const response = await fetch(`/api/instances/${instanceId}/data-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to create data source');
      }

      onComplete();
    } catch (error) {
      console.error('Error creating data source:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

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
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="authToken"
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