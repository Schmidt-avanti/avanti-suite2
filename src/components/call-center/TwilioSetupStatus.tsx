
// src/components/call-center/TwilioSetupStatus.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTwilio } from '@/contexts/TwilioContext';
import { Loader2Icon, AlertCircleIcon, CheckCircleIcon, RefreshCwIcon, WrenchIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TwilioCredentialStatus {
  key: string;
  name: string;
  configured: boolean;
}

// Define a type for the system settings data
interface SystemSetting {
  key: string;
  value: string | null;
  description?: string;
}

const TwilioSetupStatus: React.FC = () => {
  const { isSetup, setupTwilio } = useTwilio();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningSetup, setIsRunningSetup] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<TwilioCredentialStatus[]>([
    { key: 'TWILIO_ACCOUNT_SID', name: 'Account SID', configured: false },
    { key: 'TWILIO_AUTH_TOKEN', name: 'Auth Token', configured: false },
    { key: 'TWILIO_TWIML_APP_SID', name: 'TwiML App SID', configured: false },
    { key: 'TWILIO_WORKSPACE_SID', name: 'Workspace SID', configured: false },
    { key: 'TWILIO_WORKFLOW_SID', name: 'Workflow SID', configured: false }
  ]);

  useEffect(() => {
    if (user) {
      checkUserRole();
      checkCredentialStatus();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsAdmin(data.role === 'admin');
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const checkCredentialStatus = async () => {
    setIsLoading(true);
    
    try {
      // Use direct fetch API to bypass TypeScript constraints with Supabase client
      const session = await supabase.auth.getSession();
      // Use the SUPABASE_URL from env and the anon key instead of accessing protected property
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/system_settings?select=key,value,description&key=in.(TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_TWIML_APP_SID,TWILIO_WORKSPACE_SID,TWILIO_WORKFLOW_SID)`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub2V2a3ZqeXVjaGhjbXpzZHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMTEzMzcsImV4cCI6MjA2MDc4NzMzN30.gKCh5BUGsQJKCRW0JDxDEWA2M9uL3q20Wiqt8ePfoi8',
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const twilioConfigData = await response.json() as SystemSetting[];
      
      // Create a map of configured settings
      const configuredSettings = new Map<string, boolean>();
      twilioConfigData?.forEach(setting => {
        configuredSettings.set(setting.key, !!setting.value);
      });
      
      // Update the credential status based on database values
      const updatedStatus = credentialStatus.map(cred => ({
        ...cred,
        configured: configuredSettings.has(cred.key) ? configuredSettings.get(cred.key)! : false
      }));
      
      setCredentialStatus(updatedStatus);
    } catch (error) {
      console.error('Error checking Twilio credentials:', error);
      toast({
        title: "Fehler",
        description: "Konnte Twilio-Konfiguration nicht abrufen.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupWorkspace = async () => {
    if (!isAdmin) {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Administratoren können den Twilio-Arbeitsbereich einrichten.",
        variant: "destructive"
      });
      return;
    }
    
    setIsRunningSetup(true);
    
    try {
      // Call the workspace setup function with proper error handling
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-workspace-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data?.success) {
        toast({
          title: "Twilio-Einrichtung erfolgreich",
          description: "Twilio-Arbeitsbereich wurde erfolgreich eingerichtet."
        });
        
        // Refresh credential status
        checkCredentialStatus();
      } else {
        throw new Error(data?.errors?.join(', ') || 'Unbekannter Fehler bei der Einrichtung');
      }
    } catch (error) {
      console.error('Error setting up Twilio workspace:', error);
      toast({
        title: "Twilio-Einrichtung fehlgeschlagen",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsRunningSetup(false);
    }
  };

  const getStatusIcon = (configured: boolean) => {
    if (configured) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
  };

  const getOverallStatus = () => {
    const allConfigured = credentialStatus.every(cred => cred.configured);
    
    if (isLoading) {
      return (
        <div className="flex items-center text-muted-foreground">
          <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
          Status wird überprüft...
        </div>
      );
    }
    
    if (allConfigured) {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          Vollständig konfiguriert
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-amber-600">
        <AlertCircleIcon className="h-5 w-5 mr-2" />
        Teilweise konfiguriert
      </div>
    );
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Twilio-Einrichtungsstatus</CardTitle>
            <CardDescription>Status der Twilio-Integration</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkCredentialStatus}
            disabled={isLoading}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          {getOverallStatus()}
        </div>
        
        <div className="space-y-3">
          {credentialStatus.map((cred) => (
            <div key={cred.key} className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(cred.configured)}
                <span className="ml-2">{cred.name}</span>
              </div>
              <span className={cred.configured ? "text-green-600" : "text-red-500"}>
                {cred.configured ? "Konfiguriert" : "Nicht konfiguriert"}
              </span>
            </div>
          ))}
        </div>

        {!credentialStatus.every(cred => cred.configured) && isAdmin && (
          <>
            <Alert className="mt-4">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Fehlende Konfiguration</AlertTitle>
              <AlertDescription>
                Einige Twilio-Einstellungen sind noch nicht vollständig konfiguriert. 
                Für eingehende und ausgehende Anrufe benötigen Sie eine vollständige Konfiguration.
              </AlertDescription>
            </Alert>
            
            {!credentialStatus[3].configured && (
              <Button 
                className="mt-4 w-full" 
                onClick={handleSetupWorkspace}
                disabled={isRunningSetup}
              >
                {isRunningSetup ? (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <WrenchIcon className="h-4 w-4 mr-2" />
                )}
                Twilio-Arbeitsbereich einrichten
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TwilioSetupStatus;
