
// src/components/call-center/TwilioSetupStatus.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTwilio } from '@/contexts/TwilioContext';
import { AlertCircleIcon, CheckCircleIcon, RefreshCwIcon, WrenchIcon, PhoneIcon } from 'lucide-react';
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
      // Direct query to the system_settings table
      const { data: twilioConfigData, error } = await supabase
        .from('system_settings')
        .select('key, value, description')
        .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_TWIML_APP_SID', 'TWILIO_WORKSPACE_SID', 'TWILIO_WORKFLOW_SID']);
      
      if (error) {
        throw error;
      }
      
      // Create a map of configured settings
      const configuredSettings = new Map<string, boolean>();
      twilioConfigData.forEach(setting => {
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
      const { data: session } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://knoevkvjyuchhcmzsdpq.supabase.co';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/twilio-workspace-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
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
          <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
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

  // Only show this component to admins
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
              <AlertTitle>Einrichtungsschritte</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Für eine vollständige Twilio-Einrichtung sind folgende Schritte notwendig:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Die Twilio-API-Zugangsschlüssel müssen in den Supabase-Secrets konfiguriert sein.</li>
                  <li>Ein TwiML-App muss in Ihrem Twilio-Konto erstellt sein.</li>
                  <li>Führen Sie die Workspace-Einrichtung aus, um die TaskRouter-Komponenten zu erstellen.</li>
                  <li>Konfigurieren Sie mindestens eine Telefonnummer in Twilio für eingehende Anrufe.</li>
                  <li>Die Telefonnummer muss auf den Webhook <code>{import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-voice-webhook</code> verweisen.</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 space-y-3">
              {!credentialStatus.slice(0, 3).every(cred => cred.configured) && (
                <Alert className="bg-amber-50">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>API-Konfiguration fehlt</AlertTitle>
                  <AlertDescription>
                    Die grundlegenden Twilio-API-Schlüssel sind nicht konfiguriert. 
                    Bitte stellen Sie sicher, dass TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN und 
                    TWILIO_TWIML_APP_SID in den Supabase-Secrets und in der system_settings-Tabelle eingerichtet sind.
                  </AlertDescription>
                </Alert>
              )}
              
              {!credentialStatus[3].configured && credentialStatus.slice(0, 3).every(cred => cred.configured) && (
                <Button 
                  className="w-full" 
                  onClick={handleSetupWorkspace}
                  disabled={isRunningSetup}
                >
                  {isRunningSetup ? (
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <WrenchIcon className="h-4 w-4 mr-2" />
                  )}
                  Twilio-Arbeitsbereich einrichten
                </Button>
              )}
              
              {credentialStatus.slice(0, 4).every(cred => cred.configured) && !credentialStatus[4].configured && (
                <Alert className="bg-amber-50">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Workflow-Konfiguration</AlertTitle>
                  <AlertDescription>
                    Der Workspace wurde erfolgreich erstellt, aber der Workflow fehlt noch.
                    Führen Sie die Workspace-Einrichtung erneut aus, um den Workflow zu erstellen.
                  </AlertDescription>
                </Alert>
              )}
              
              {credentialStatus.every(cred => cred.configured) && (
                <Alert className="bg-green-50">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <AlertTitle>Konfiguration vollständig</AlertTitle>
                  <AlertDescription>
                    Alle Twilio-Komponenten sind korrekt konfiguriert. 
                    Stellen Sie sicher, dass Ihre Twilio-Telefonnummern auf den Webhook verweisen:
                    <code className="block mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-voice-webhook
                    </code>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TwilioSetupStatus;
