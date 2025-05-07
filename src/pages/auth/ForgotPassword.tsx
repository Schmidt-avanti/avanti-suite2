
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, Info, Mail, Loader } from "lucide-react";
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // First check if the email exists in our database
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-email', {
        body: { email }
      });

      if (validationError) {
        throw new Error('Fehler bei der Validierung der E-Mail-Adresse.');
      }

      if (!validationData.exists) {
        setError('Diese E-Mail-Adresse ist nicht registriert. Bitte kontaktiere deinen Administrator, wenn du Zugang benötigst.');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        return;
      }

      // If email exists, proceed with sending the magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (error) {
        throw error;
      }

      setSuccess(`Eine E-Mail mit einem Magic-Link wurde an ${email} gesendet. Bitte klicke auf den Link in der E-Mail, um dich anzumelden.`);
    } catch (error: any) {
      console.error('Magic link error:', error);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      
      if (typeof error.message === 'string') {
        setError(error.message);
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
            <CardTitle className="text-2xl font-bold text-center">Anmeldung via Magic-Link</CardTitle>
            <CardDescription className="text-center">
              Gib deine E-Mail-Adresse ein, um einen Magic-Link zu erhalten
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
                <Info className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700">Erfolg</AlertTitle>
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Loader className="animate-spin" />
                    Magic-Link wird versendet...
                  </motion.div>
                ) : (
                  'Magic-Link senden'
                )}
              </Button>
              
              <div className="mt-4 text-center">
                <Link 
                  to="/auth/login" 
                  className="text-avanti-600 hover:text-avanti-800 flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowLeft size={16} />
                  Zurück zur Anmeldung
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
