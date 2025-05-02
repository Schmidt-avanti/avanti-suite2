
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Check, Key, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if we have the token from the URL
  const recoveryToken = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    // Verify that the token and type parameters are present
    if (!recoveryToken || type !== 'recovery') {
      setError('Ungültiger oder fehlender Wiederherstellungs-Token. Bitte fordere einen neuen Link an.');
    }
  }, [recoveryToken, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (!password || password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update the password using the recovery token
      const { error } = await supabase.auth.updateUser({ 
        password 
      });

      if (error) {
        throw error;
      }

      // Password update successful
      setSuccess(true);
      toast({
        title: "Passwort aktualisiert",
        description: "Dein Passwort wurde erfolgreich aktualisiert.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      
      if (typeof error.message === 'string') {
        if (error.message.includes('invalid token')) {
          setError('Der Wiederherstellungs-Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        <Card className={cn(
          "shadow-xl rounded-2xl p-8 bg-white border-t border-avanti-100/20",
          shake && "animate-[shake_0.6s_cubic-bezier(0.36,0.07,0.19,0.97)_both]"
        )}>
          <CardHeader className="pb-4 space-y-2">
            <CardTitle className="text-2xl font-bold text-center">Passwort zurücksetzen</CardTitle>
            <CardDescription className="text-center">
              Bitte gib ein neues Passwort ein
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
            
            {success && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700">Erfolg</AlertTitle>
                <AlertDescription className="text-green-600">
                  Dein Passwort wurde erfolgreich zurückgesetzt. Du wirst zur Anmeldeseite weitergeleitet...
                </AlertDescription>
              </Alert>
            )}
            
            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Neues Passwort</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 focus:ring-2 focus:ring-avanti-200 focus:border-avanti-300"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10 focus:ring-2 focus:ring-avanti-200 focus:border-avanti-300"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className={cn(
                    "w-full bg-gradient-to-r from-avanti-600 to-avanti-700 hover:from-avanti-700 hover:to-avanti-800 transition-all duration-200",
                    isSubmitting && "cursor-not-allowed opacity-80"
                  )}
                  disabled={isSubmitting || !recoveryToken || type !== 'recovery'}
                >
                  {isSubmitting ? (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Loader className="animate-spin" />
                      Wird aktualisiert...
                    </motion.div>
                  ) : (
                    'Passwort aktualisieren'
                  )}
                </Button>
                
                <div className="mt-4 text-center">
                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/auth/login')}
                    className="text-avanti-600 hover:text-avanti-800 flex items-center justify-center gap-2 text-sm w-full"
                  >
                    <ArrowLeft size={16} />
                    Zurück zur Anmeldung
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
