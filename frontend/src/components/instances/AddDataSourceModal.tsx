import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Github, BookOpen, FileText, MessageSquare, HelpCircle } from 'lucide-react';

const dataSourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  type: z.enum(['github', 'confluence', 'notion', 'slack', 'zendesk']),
  config: z.object({
    authToken: z.string().min(1, 'Authentication token is required'),
    repositories: z.string().optional(),
    spaces: z.string().optional(),
    channels: z.string().optional(),
  }),
});

type DataSourceFormValues = z.infer<typeof dataSourceSchema>;

interface AddDataSourceModalProps {
  instanceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const sourceTypes = [
  { id: 'github', name: 'GitHub', icon: Github, description: 'Connect your GitHub repositories' },
  { id: 'confluence', name: 'Confluence', icon: BookOpen, description: 'Import Confluence spaces and pages' },
  { id: 'notion', name: 'Notion', icon: FileText, description: 'Sync Notion workspaces and databases' },
  { id: 'slack', name: 'Slack', icon: MessageSquare, description: 'Index Slack channels and threads' },
  { id: 'zendesk', name: 'Zendesk', icon: HelpCircle, description: 'Import Zendesk tickets and articles' },
];

export function AddDataSourceModal({ instanceId, isOpen, onClose, onSuccess }: AddDataSourceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceSchema),
    defaultValues: {
      name: '',
      type: 'github',
      config: {
        authToken: '',
      },
    },
  });

  const selectedType = form.watch('type');

  const onSubmit = async (values: DataSourceFormValues) => {
    try {
      setIsSubmitting(true);
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

      toast({
        title: 'Data source added',
        description: 'Your data source has been successfully added and will begin syncing.',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to add data source. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfigFields = () => {
    switch (selectedType) {
      case 'github':
        return (
          <>
            <FormField
              control={form.control}
              name="config.repositories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repositories</FormLabel>
                  <FormControl>
                    <Input placeholder="owner/repo, owner/repo2" {...field} />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of repositories (e.g., "owner/repo")
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'confluence':
        return (
          <FormField
            control={form.control}
            name="config.spaces"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Space Keys</FormLabel>
                <FormControl>
                  <Input placeholder="TEAM, ENG, DOCS" {...field} />
                </FormControl>
                <FormDescription>
                  Comma-separated list of Confluence space keys
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'slack':
        return (
          <FormField
            control={form.control}
            name="config.channels"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channels</FormLabel>
                <FormControl>
                  <Input placeholder="#general, #support" {...field} />
                </FormControl>
                <FormDescription>
                  Comma-separated list of channel names (including #)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Data Source</DialogTitle>
          <DialogDescription>
            Connect a new data source to enhance your knowledge base.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Product Documentation" {...field} />
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
                        <SelectValue placeholder="Select a source type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sourceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {sourceTypes.find((t) => t.id === selectedType)?.description}
                  </FormDescription>
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
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    API token or access key for authentication
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {getConfigFields()}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Data Source'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 