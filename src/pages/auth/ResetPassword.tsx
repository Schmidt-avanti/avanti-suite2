
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ResetPassword: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleTokenVerification = async () => {
      try {
        setIsVerifying(true);
        setError(null);

        // Get token from URL
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        // Check if we have the required parameters
        if (!token) {
          setError('Fehlender Token. Bitte fordere einen neuen Magic Link an.');
          setIsVerifying(false);
          return;
        }

        console.log("Token detected:", { token, type });

        // Let the Auth state change handler handle the actual session
        // Just show a success message and redirect soon
        setSuccess(true);
        
        // Redirect to home after 3 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
        
      } catch (error: any) {
        console.error('Token verification error:', error);
        setError('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
      } finally {
        setIsVerifying(false);
      }
    };

    handleTokenVerification();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 mt-20">
        <div className="text-center">
          <h1 className="flex justify-center mb-6">
            <img 
              alt="avanti suite" 
              className="h-20 transform hover:scale-105 transition-transform duration-200" 
              src="/lovable-uploads/eff651fc-49c9-4b51-b5bc-d14c401b3934.png" 
            />
          </h1>
        </div>
        
        <Card className="shadow-xl rounded-2xl p-8 bg-white border-t border-avanti-100/20">
          <CardHeader className="pb-4 space-y-2">
            <CardTitle className="text-2xl font-bold text-center">Magic Link</CardTitle>
            <CardDescription className="text-center">
              Dein Magic Link wird verarbeitet
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isVerifying && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader className="h-8 w-8 text-avanti-600 animate-spin mb-4" />
                <p className="text-gray-600">Magic Link wird verarbeitet...</p>
              </div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="rounded-full bg-green-100 p-3 mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-700 mb-2">
                  Login erfolgreich!
                </h3>
                <p className="text-gray-600 text-center">
                  Du wirst in Kürze zur Startseite weitergeleitet...
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
