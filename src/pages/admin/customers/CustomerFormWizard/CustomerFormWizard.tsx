
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import CustomerMasterDataStep from '../CustomerMasterDataStep';
import CustomerContactsStep from '../CustomerContactsStep';
import CustomerToolsStep from '../CustomerToolsStep';
import Stepper from './Stepper';
import useCustomerForm from './useCustomerForm';

const CustomerFormWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    customerData,
    contactPersons,
    selectedTools,
    isLoading,
    errors,
    updateCustomerData,
    updateContactPersons,
    updateSelectedTools,
    handleSubmit
  } = useCustomerForm();

  const steps = [
    { label: 'Master Data', completed: false },
    { label: 'Contact Persons', completed: false },
    { label: 'Tools', completed: false },
  ];

  const handleNext = async () => {
    if (currentStep === 0) {
      // Validate master data
      if (!customerData.name || !customerData.email) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep === 1) {
      // Validate that at least one contact person exists
      if (contactPersons.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please add at least one contact person',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit form on last step
      try {
        await handleSubmit();
        toast({
          title: 'Success',
          description: 'Customer created successfully',
        });
        navigate('/admin/customers');
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to create customer',
          variant: 'destructive',
        });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    navigate('/admin/customers');
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Customer</h1>
      
      <div className="mb-8">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {currentStep === 0 && (
            <CustomerMasterDataStep 
              data={customerData} 
              onChange={updateCustomerData}
              errors={errors.customerData || {}}
            />
          )}
          {currentStep === 1 && (
            <CustomerContactsStep 
              contactPersons={contactPersons} 
              onChange={updateContactPersons}
              errors={errors.contactPersons || {}}
            />
          )}
          {currentStep === 2 && (
            <CustomerToolsStep
              selectedTools={selectedTools}
              onChange={updateSelectedTools}
            />
          )}
          
          <div className="flex justify-between mt-8">
            <div>
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
            <div className="space-x-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button 
                onClick={handleNext}
                disabled={isLoading}
              >
                {currentStep === steps.length - 1 ? (
                  'Create Customer'
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerFormWizard;
