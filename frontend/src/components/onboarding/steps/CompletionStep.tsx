'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface CompletionStepProps {
  onComplete: () => void;
}

export function CompletionStep({ onComplete }: CompletionStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>

      <div>
        <h2 className="text-2xl font-semibold">Setup Complete!</h2>
        <p className="text-muted-foreground mt-2">
          Your Veritas instance is now ready. We're starting to index your data source, 
          and you'll be notified when it's ready for queries.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">What's Next?</h3>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>• Configure your deployment options (Website Widget, Slack Bot)</li>
          <li>• Add more data sources to expand your knowledge base</li>
          <li>• Explore analytics as users start asking questions</li>
        </ul>
      </div>

      <Button onClick={onComplete} className="w-full">
        Go to Dashboard
      </Button>
    </div>
  );
} 