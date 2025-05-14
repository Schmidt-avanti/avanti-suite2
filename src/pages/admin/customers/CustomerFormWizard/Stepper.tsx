
import React from 'react';

export interface StepperProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: string[];
}

const Stepper: React.FC<StepperProps> = ({ currentStep, setCurrentStep, steps }) => {
  return (
    <div className="flex justify-between mb-8">
      {steps.map((step, index) => (
        <div
          key={index}
          className="flex flex-col items-center"
          onClick={() => setCurrentStep(index)}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            index === currentStep
              ? 'bg-primary text-primary-foreground'
              : index < currentStep
              ? 'bg-primary/20 text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          } mb-2 cursor-pointer transition-colors`}>
            {index + 1}
          </div>
          <span className={`text-xs ${
            index === currentStep ? 'font-medium' : 'text-muted-foreground'
          }`}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Stepper;
