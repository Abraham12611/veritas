import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { InstancesTable } from '@/components/dashboard/InstancesTable';
import { Plus } from 'lucide-react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

async function getInstances() {
  // TODO: Fetch instances from API
  return [];
}

export default async function InstancesPage() {
  const instances = await getInstances();

  return (
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Instances</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Veritas instances and their configurations.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Instance
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <div className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold">Your Instances</h2>
              <p className="text-sm text-muted-foreground">
                View and manage all your Veritas instances. Click on an instance to see its details.
              </p>
            </div>

            <Suspense fallback={<InstancesTable instances={[]} isLoading />}>
              <InstancesTable instances={instances} />
            </Suspense>
          </div>
        </div>
      </div>

      {instances.length === 0 && (
        <OnboardingWizard
          isOpen={true}
          onClose={() => {
            // TODO: Handle close
          }}
        />
      )}
    </div>
  );
} 