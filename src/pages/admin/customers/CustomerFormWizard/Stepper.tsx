
import React from "react";

interface StepperProps {
  step: 1 | 2 | 3;
  setStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
}

const Stepper: React.FC<StepperProps> = ({ step }) => (
  <div className="flex items-center space-x-2 pb-2 text-sm">
    <div className={`rounded-full px-3 py-1 ${step === 1 ? "bg-primary text-white" : "bg-gray-200"}`}>1. Stammdaten</div>
    <span className="text-gray-400">→</span>
    <div className={`rounded-full px-3 py-1 ${step === 2 ? "bg-primary text-white" : "bg-gray-200"}`}>2. Tools</div>
    <span className="text-gray-400">→</span>
    <div className={`rounded-full px-3 py-1 ${step === 3 ? "bg-primary text-white" : "bg-gray-200"}`}>3. Ansprechpartner</div>
  </div>
);

export default Stepper;
