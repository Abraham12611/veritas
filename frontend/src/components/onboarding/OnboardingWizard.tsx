'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreateInstanceStep } from './steps/CreateInstanceStep';
import { AddDataSourceStep } from './steps/AddDataSourceStep';
import { CompletionStep } from './steps/CompletionStep';

export type OnboardingStep = 'create-instance' | 'add-data-source' | 'completion';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('create-instance');
  const [instanceId, setInstanceId] = useState<string>('');

  const handleInstanceCreated = (id: string) => {
    setInstanceId(id);
    setCurrentStep('add-data-source');
  };

  const handleDataSourceAdded = () => {
    setCurrentStep('completion');
  };

  const handleComplete = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="space-y-6">
            {currentStep === 'create-instance' && (
              <CreateInstanceStep onComplete={handleInstanceCreated} />
            )}
            
            {currentStep === 'add-data-source' && (
              <AddDataSourceStep 
                instanceId={instanceId}
                onComplete={handleDataSourceAdded}
                onBack={() => setCurrentStep('create-instance')}
              />
            )}
            
            {currentStep === 'completion' && (
              <CompletionStep onComplete={handleComplete} />
            )}

            <div className="flex justify-between pt-4 border-t">
              {currentStep !== 'create-instance' && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => 
                    prev === 'completion' ? 'add-data-source' : 'create-instance'
                  )}
                >
                  Back
                </Button>
              )}
              
              {currentStep === 'completion' && (
                <Button onClick={handleComplete}>
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 