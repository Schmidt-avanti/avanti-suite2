
import React from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';

interface StepperProps {
  steps: Array<{
    label: string;
    completed: boolean;
  }>;
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step Circle */}
            <div className="relative">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2",
                  index < currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : index === currentStep
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span
                  className={cn(
                    "text-sm font-medium",
                    index <= currentStep
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2",
                  index < currentStep
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Stepper;
