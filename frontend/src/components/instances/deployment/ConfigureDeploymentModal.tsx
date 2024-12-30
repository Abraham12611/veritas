import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const deploymentSchema = z.object({
  type: z.enum(['website_widget', 'slack_bot', 'discord_bot', 'api']),
  config: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    enabled: z.boolean(),
    
    // Website Widget specific
    widgetTitle: z.string().optional(),
    theme: z.enum(['light', 'dark']).optional(),
    position: z.enum(['bottom-right', 'bottom-left']).optional(),
    
    // Slack specific
    workspaceId: z.string().optional(),
    channelIds: z.string().optional(), // Will be split into array
    
    // Discord specific
    serverId: z.string().optional(),
    
    // API specific
    apiKey: z.string().optional(),
    allowedOrigins: z.string().optional(), // Will be split into array
  }),
});

type DeploymentFormValues = z.infer<typeof deploymentSchema>;

interface ConfigureDeploymentModalProps {
  instanceId: string;
  deploymentType: 'website_widget' | 'slack_bot' | 'discord_bot' | 'api';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingConfig?: any;
}

export function ConfigureDeploymentModal({
  instanceId,
  deploymentType,
  isOpen,
  onClose,
  onSuccess,
  existingConfig,
}: ConfigureDeploymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<DeploymentFormValues>({
    resolver: zodResolver(deploymentSchema),
    defaultValues: {
      type: deploymentType,
      config: {
        name: existingConfig?.name || '',
        enabled: existingConfig?.enabled || false,
        widgetTitle: existingConfig?.widgetTitle || '',
        theme: existingConfig?.theme || 'dark',
        position: existingConfig?.position || 'bottom-right',
        workspaceId: existingConfig?.workspaceId || '',
        channelIds: existingConfig?.channelIds?.join(', ') || '',
        serverId: existingConfig?.serverId || '',
        apiKey: existingConfig?.apiKey || '',
        allowedOrigins: existingConfig?.allowedOrigins?.join(', ') || '',
      },
    },
  });

  const onSubmit = async (values: DeploymentFormValues) => {
    try {
      setIsSubmitting(true);

      // Transform array fields from comma-separated strings
      const config = {
        ...values.config,
        channelIds: values.config.channelIds
          ? values.config.channelIds.split(',').map((id) => id.trim())
          : undefined,
        allowedOrigins: values.config.allowedOrigins
          ? values.config.allowedOrigins.split(',').map((origin) => origin.trim())
          : undefined,
      };

      const response = await fetch(`/api/instances/${instanceId}/deployments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: values.type,
          config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save deployment configuration');
      }

      toast({
        title: 'Deployment configured',
        description: 'Your deployment settings have been saved successfully.',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error configuring deployment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save deployment configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (deploymentType) {
      case 'website_widget':
        return 'Configure Website Widget';
      case 'slack_bot':
        return 'Configure Slack Bot';
      case 'discord_bot':
        return 'Configure Discord Bot';
      case 'api':
        return 'Configure API Access';
      default:
        return 'Configure Deployment';
    }
  };

  const getDescription = () => {
    switch (deploymentType) {
      case 'website_widget':
        return 'Customize and get the embed code for your website widget.';
      case 'slack_bot':
        return 'Connect Veritas to your Slack workspace.';
      case 'discord_bot':
        return 'Add Veritas to your Discord server.';
      case 'api':
        return 'Generate API keys and manage access settings.';
      default:
        return '';
    }
  };

  const renderWebsiteWidgetFields = () => (
    <>
      <FormField
        control={form.control}
        name="config.widgetTitle"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Widget Title</FormLabel>
            <FormControl>
              <Input placeholder="Ask me anything..." {...field} />
            </FormControl>
            <FormDescription>
              The title shown at the top of the chat widget
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="config.theme"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Theme</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="config.position"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Position</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select widget position" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4 mt-6">
        <h3 className="font-medium">Embed Code</h3>
        <pre className="bg-secondary p-4 rounded-lg text-sm overflow-x-auto">
          {`<script src="https://veritas.ai/widget.js"></script>
<script>
  Veritas.init({
    instanceId: "${instanceId}",
    theme: "${form.watch('config.theme')}",
    position: "${form.watch('config.position')}"
  });
</script>`}
        </pre>
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(`<script src="https://veritas.ai/widget.js"></script>
<script>
  Veritas.init({
    instanceId: "${instanceId}",
    theme: "${form.watch('config.theme')}",
    position: "${form.watch('config.position')}"
  });
</script>`);
            toast({
              title: 'Copied to clipboard',
              description: 'The embed code has been copied to your clipboard.',
            });
          }}
        >
          Copy Code
        </Button>
      </div>
    </>
  );

  const renderSlackBotFields = () => (
    <>
      <FormField
        control={form.control}
        name="config.workspaceId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Workspace ID</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormDescription>
              Your Slack workspace ID (found in workspace settings)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="config.channelIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Channel IDs</FormLabel>
            <FormControl>
              <Input placeholder="C1234567890, C0987654321" {...field} />
            </FormControl>
            <FormDescription>
              Comma-separated list of channel IDs where the bot should be active
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4 mt-6">
        <h3 className="font-medium">Installation</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Click the "Add to Slack" button below</li>
          <li>Select the workspace where you want to install Veritas</li>
          <li>Choose the channels where Veritas should be active</li>
          <li>Authorize the required permissions</li>
        </ol>
        <Button className="w-full">
          Add to Slack
        </Button>
      </div>
    </>
  );

  const renderDiscordBotFields = () => (
    <>
      <FormField
        control={form.control}
        name="config.serverId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Server ID</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormDescription>
              Your Discord server ID (found in server settings)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4 mt-6">
        <h3 className="font-medium">Installation</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Click the "Add to Discord" button below</li>
          <li>Select the server where you want to install Veritas</li>
          <li>Authorize the required permissions</li>
          <li>Configure channel access in your server settings</li>
        </ol>
        <Button className="w-full">
          Add to Discord
        </Button>
      </div>
    </>
  );

  const renderApiFields = () => (
    <>
      <FormField
        control={form.control}
        name="config.apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <Input type="password" {...field} readOnly />
            </FormControl>
            <FormDescription>
              Use this key to authenticate API requests
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="config.allowedOrigins"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Allowed Origins</FormLabel>
            <FormControl>
              <Input placeholder="https://example.com, https://app.example.com" {...field} />
            </FormControl>
            <FormDescription>
              Comma-separated list of allowed origins for CORS
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4 mt-6">
        <h3 className="font-medium">API Documentation</h3>
        <Tabs defaultValue="curl">
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="node">Node.js</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="mt-2">
            <pre className="bg-secondary p-4 rounded-lg text-sm overflow-x-auto">
              {`curl -X POST https://api.veritas.ai/v1/query \\
  -H "Authorization: Bearer ${form.watch('config.apiKey')}" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What is Veritas?"}'`}
            </pre>
          </TabsContent>
          <TabsContent value="node" className="mt-2">
            <pre className="bg-secondary p-4 rounded-lg text-sm overflow-x-auto">
              {`const response = await fetch('https://api.veritas.ai/v1/query', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${form.watch('config.apiKey')}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'What is Veritas?',
  }),
});`}
            </pre>
          </TabsContent>
          <TabsContent value="python" className="mt-2">
            <pre className="bg-secondary p-4 rounded-lg text-sm overflow-x-auto">
              {`import requests

response = requests.post(
    'https://api.veritas.ai/v1/query',
    headers={
        'Authorization': 'Bearer ${form.watch('config.apiKey')}',
        'Content-Type': 'application/json',
    },
    json={'query': 'What is Veritas?'}
)`}
            </pre>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );

  const renderConfigFields = () => {
    switch (deploymentType) {
      case 'website_widget':
        return renderWebsiteWidgetFields();
      case 'slack_bot':
        return renderSlackBotFields();
      case 'discord_bot':
        return renderDiscordBotFields();
      case 'api':
        return renderApiFields();
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="config.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    A name to identify this deployment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config.enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Enabled
                    </FormLabel>
                    <FormDescription>
                      Turn this deployment on or off
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {renderConfigFields()}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 