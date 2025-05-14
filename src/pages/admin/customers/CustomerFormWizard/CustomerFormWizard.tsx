
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CustomerMasterDataStep from '../CustomerMasterDataStep';
import CustomerContactsStep from '../CustomerContactsStep';
import CustomerToolsStep from '../CustomerToolsStep';
import Stepper from './Stepper';
import useCustomerForm from './useCustomerForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2Icon, PhoneIcon, SaveIcon, ServerIcon } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CustomerFormWizard = () => {
  const { formState, customer, setCustomer, handleFormSubmit, isSubmitting } = useCustomerForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('customer');
  const { toast } = useToast();
  const [twilioSettings, setTwilioSettings] = useState({
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_TWIML_APP_SID: '',
    TWILIO_WORKSPACE_SID: '',
    TWILIO_WORKFLOW_SID: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch current Twilio settings
  const fetchTwilioSettings = async () => {
    setIsLoading(true);
    try {
      // Get the current session for authentication
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      
      if (!accessToken) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to view Twilio settings",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://knoevkvjyuchhcmzsdpq.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub2V2a3ZqeXVjaGhjbXpzZHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMTEzMzcsImV4cCI6MjA2MDc4NzMzN30.gKCh5BUGsQJKCRW0JDxDEWA2M9uL3q20Wiqt8ePfoi8';
      
      console.log('Fetching Twilio settings from URL:', `${supabaseUrl}/rest/v1/system_settings`);
      
      // Direct REST API call to get the system settings (bypassing typing issues)
      const response = await fetch(
        `${supabaseUrl}/rest/v1/system_settings?select=key,value,description&key=in.(TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_TWIML_APP_SID,TWILIO_WORKSPACE_SID,TWILIO_WORKFLOW_SID)`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const settingsData = await response.json();
      console.log('Fetched Twilio settings:', settingsData);
      
      // Convert array of settings to object
      const settings = settingsData.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value || '';
        return acc;
      }, {});
      
      setTwilioSettings({
        TWILIO_ACCOUNT_SID: settings.TWILIO_ACCOUNT_SID || '',
        TWILIO_AUTH_TOKEN: settings.TWILIO_AUTH_TOKEN || '',
        TWILIO_TWIML_APP_SID: settings.TWILIO_TWIML_APP_SID || '',
        TWILIO_WORKSPACE_SID: settings.TWILIO_WORKSPACE_SID || '',
        TWILIO_WORKFLOW_SID: settings.TWILIO_WORKFLOW_SID || ''
      });
    } catch (error) {
      console.error('Error fetching Twilio settings:', error);
      toast({
        title: "Error",
        description: "Could not fetch Twilio settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to save Twilio settings
  const saveTwilioSettings = async () => {
    setIsSaving(true);
    try {
      // Get the current session for authentication
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      
      if (!accessToken) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to update Twilio settings",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }

      // Format the settings into an array for upsert
      const settingsArray = Object.entries(twilioSettings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString()
      }));
      
      // Perform upserts one by one
      for (const setting of settingsArray) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, { onConflict: 'key' });
          
        if (error) {
          console.error(`Error saving setting ${setting.key}:`, error);
          throw new Error(`Error saving ${setting.key}: ${error.message}`);
        }
      }
      
      toast({
        title: "Success",
        description: "Twilio settings saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving Twilio settings:', error);
      toast({
        title: "Error",
        description: error.message || "Could not save Twilio settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Load Twilio settings when the tab changes to 'twilio'
  useEffect(() => {
    if (activeTab === 'twilio') {
      fetchTwilioSettings();
    }
  }, [activeTab]);

  const steps = [
    {
      title: "Master Data",
      component: <CustomerMasterDataStep 
        customer={customer}
        setCustomer={setCustomer}
      />
    },
    {
      title: "Tools",
      component: <CustomerToolsStep 
        customer={customer}
        setCustomer={setCustomer}
      />
    },
    {
      title: "Contacts",
      component: <CustomerContactsStep 
        customer={customer}
        setCustomer={setCustomer}
      />
    }
  ];
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {formState === 'edit' ? 'Edit Customer' : 'Create Customer'}
        </CardTitle>
        <CardDescription>
          {formState === 'edit' 
            ? 'Update the information for this customer' 
            : 'Fill in the customer information to add a new customer'}
        </CardDescription>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="customer">Customer Information</TabsTrigger>
            <TabsTrigger value="twilio">Twilio Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="customer">
            <Stepper 
              currentStep={currentStep} 
              setCurrentStep={setCurrentStep} 
              steps={steps.map(step => step.title)}
            />
          </TabsContent>
          
          <TabsContent value="twilio">
            <div className="flex items-center">
              <PhoneIcon className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-medium">Twilio Integration Settings</h3>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {activeTab === 'customer' ? (
          <>
            {steps[currentStep].component}
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={prevStep} 
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button onClick={nextStep}>Next</Button>
              ) : (
                <Button 
                  onClick={handleFormSubmit} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="accountSid">Account SID</Label>
                    <Input
                      id="accountSid"
                      value={twilioSettings.TWILIO_ACCOUNT_SID}
                      onChange={(e) => setTwilioSettings({
                        ...twilioSettings,
                        TWILIO_ACCOUNT_SID: e.target.value
                      })}
                      placeholder="Twilio Account SID"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="authToken">Auth Token</Label>
                    <Input
                      id="authToken"
                      type="password"
                      value={twilioSettings.TWILIO_AUTH_TOKEN}
                      onChange={(e) => setTwilioSettings({
                        ...twilioSettings,
                        TWILIO_AUTH_TOKEN: e.target.value
                      })}
                      placeholder="Twilio Auth Token"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="twimlAppSid">TwiML App SID</Label>
                    <Input
                      id="twimlAppSid"
                      value={twilioSettings.TWILIO_TWIML_APP_SID}
                      onChange={(e) => setTwilioSettings({
                        ...twilioSettings,
                        TWILIO_TWIML_APP_SID: e.target.value
                      })}
                      placeholder="Twilio TwiML App SID"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="workspaceSid">Workspace SID</Label>
                    <Input
                      id="workspaceSid"
                      value={twilioSettings.TWILIO_WORKSPACE_SID}
                      onChange={(e) => setTwilioSettings({
                        ...twilioSettings,
                        TWILIO_WORKSPACE_SID: e.target.value
                      })}
                      placeholder="TaskRouter Workspace SID"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="workflowSid">Workflow SID</Label>
                    <Input
                      id="workflowSid"
                      value={twilioSettings.TWILIO_WORKFLOW_SID}
                      onChange={(e) => setTwilioSettings({
                        ...twilioSettings,
                        TWILIO_WORKFLOW_SID: e.target.value
                      })}
                      placeholder="TaskRouter Workflow SID"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={saveTwilioSettings}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Saving Settings...
                      </>
                    ) : (
                      <>
                        <ServerIcon className="mr-2 h-4 w-4" />
                        Save Twilio Settings
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground mt-4">
                  <p>These settings are required for the Twilio integration to work properly.</p>
                  <p>You can find these values in your Twilio account dashboard.</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerFormWizard;
