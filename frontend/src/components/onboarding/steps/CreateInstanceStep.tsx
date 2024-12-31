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
import { Loader2 } from 'lucide-react';

const instanceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  environment: z.enum(['public', 'private']),
});

type InstanceFormValues = z.infer<typeof instanceSchema>;

interface CreateInstanceStepProps {
  onComplete: (instanceId: string) => void;
}

export function CreateInstanceStep({ onComplete }: CreateInstanceStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<InstanceFormValues>({
    resolver: zodResolver(instanceSchema),
    defaultValues: {
      name: '',
      environment: 'public',
    },
  });

  const onSubmit = async (values: InstanceFormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create instance');
      }

      toast({
        title: 'Success',
        description: 'Instance created successfully',
      });

      onComplete(data.id);
    } catch (error) {
      console.error('Error creating instance:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create instance',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Create Your First Instance</h2>
        <p className="text-muted-foreground">
          An instance is a dedicated AI assistant that can be configured for either public or internal use.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instance Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., My SaaS Public" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="environment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Environment</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select environment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="public">Public (External)</SelectItem>
                    <SelectItem value="private">Private (Internal)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating...' : 'Create Instance'}
          </Button>
        </form>
      </Form>
    </div>
  );
} 