
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, Mail, Lock, Loader } from "lucide-react";
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import LoginTransition from './LoginTransition';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      console.log("User already logged in, redirecting...", user);
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Bitte gib E-Mail und Passwort ein.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      await signIn(email, password);
      setLoginSuccess(true);
      setShowTransition(true);
    } catch (error: any) {
      console.error('Login error:', error);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      
      if (error.message?.includes('Profil fehlt') || error.message === 'Kein Profil gefunden') {
        setError('Es existiert kein Profil für diesen Nutzer. Bitte kontaktiere deinen Administrator.');
        setInfo('Ein Administrator muss zuerst ein Profil für deinen Account anlegen, bevor du dich anmelden kannst.');
      } else if (error.message?.includes('Invalid login credentials') || error.message?.includes('Falsche E-Mail oder Passwort')) {
        setError('Falsche E-Mail oder Passwort. Bitte versuche es erneut.');
      } else if (typeof error.message === 'string') {
        setError(error.message);
      } else {
        setError('Bei der Anmeldung ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
      }
    } finally {
      if (!loginSuccess) {
        setIsSubmitting(false);
      }
    }
  };

  const handleTransitionComplete = () => {
    navigate('/');
  };

  return (
    <>
      <Card className={cn(
        "shadow-xl rounded-2xl p-8 bg-white border-t border-avanti-100/20",
        shake && "animate-[shake_0.6s_cubic-bezier(0.36,0.07,0.19,0.97)_both]"
      )}>
        <CardHeader className="pb-4 space-y-2">
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Melde dich mit deinen Zugangsdaten an
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md text-sm text-blue-800 shadow-sm">
            <strong>Hinweis:</strong> Du benötigst ein Benutzerprofil? Ein Administrator muss dich zuerst freischalten.
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {info && (
            <Alert className="mb-4 bg-avanti-50 border-avanti-200">
              <Info className="h-4 w-4 text-avanti-600" />
              <AlertTitle className="text-avanti-700">Information</AlertTitle>
              <AlertDescription className="text-avanti-600">{info}</AlertDescription>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <a href="/auth/forgot-password" className="text-sm text-avanti-600 hover:text-avanti-800 transition-colors">
                  Passwort vergessen?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
                  Wird angemeldet...
                </motion.div>
              ) : (
                'Anmelden'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {showTransition && (
        <LoginTransition
          userName={email.split('@')[0]}
          onComplete={handleTransitionComplete}
        />
      )}
    </>
  );
};

export default LoginForm;
