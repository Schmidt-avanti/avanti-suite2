
import React from "react";

interface StepperProps {
  steps?: string[];
  step?: 1 | 2 | 3;
  currentStep?: number;
  setStep?: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  setCurrentStep?: React.Dispatch<React.SetStateAction<number>>;
}

const Stepper: React.FC<StepperProps> = ({ step, setStep, steps, currentStep, setCurrentStep }) => {
  // Render based on either step or currentStep (whichever is provided)
  const activeStep = step !== undefined ? step : currentStep;
  
  if (steps && activeStep !== undefined) {
    // Render stepper with custom steps array
    return (
      <div className="flex items-center space-x-2 pb-2 text-sm">
        {steps.map((stepLabel, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-400">→</span>}
            <div 
              className={`rounded-full px-3 py-1 ${activeStep === index ? "bg-primary text-white" : "bg-gray-200"}`}
              onClick={() => {
                if (setStep && typeof step !== 'undefined') {
                  setStep((index + 1) as 1 | 2 | 3);
                } else if (setCurrentStep) {
                  setCurrentStep(index);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {`${index + 1}. ${stepLabel}`}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }
  
  // Original implementation for backward compatibility
  return (
    <div className="flex items-center space-x-2 pb-2 text-sm">
      <div 
        className={`rounded-full px-3 py-1 ${step === 1 ? "bg-primary text-white" : "bg-gray-200"}`}
        onClick={() => setStep && setStep(1)}
        style={{ cursor: 'pointer' }}
      >
        1. Stammdaten
      </div>
      <span className="text-gray-400">→</span>
      <div 
        className={`rounded-full px-3 py-1 ${step === 2 ? "bg-primary text-white" : "bg-gray-200"}`}
        onClick={() => setStep && setStep(2)}
        style={{ cursor: 'pointer' }}
      >
        2. Tools
      </div>
      <span className="text-gray-400">→</span>
      <div 
        className={`rounded-full px-3 py-1 ${step === 3 ? "bg-primary text-white" : "bg-gray-200"}`}
        onClick={() => setStep && setStep(3)}
        style={{ cursor: 'pointer' }}
      >
        3. Ansprechpartner
      </div>
    </div>
  );
};

export default Stepper;
