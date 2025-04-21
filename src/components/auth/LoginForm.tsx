
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Bitte gib E-Mail und Passwort ein.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setInfo(null);
    
    try {
      console.log("Attempting login for:", email);
      
      await signIn(email, password);
      console.log("Login successful, navigating to home");
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message?.includes('Profil fehlt') || error.message === 'Kein Profil gefunden') {
        setError('Es existiert kein Profil für diesen Nutzer. Bitte kontaktiere deinen Administrator.');
        setInfo('Ein Administrator muss zuerst ein Profil für deinen Account anlegen, bevor du dich anmelden kannst.');
      } else if (error.message?.includes('Invalid login credentials')) {
        setError('Falsche E-Mail oder Passwort. Bitte versuche es erneut.');
      } else if (typeof error.message === 'string') {
        setError(error.message);
      } else {
        setError('Bei der Anmeldung ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
        <CardDescription className="text-center">
          Melde dich mit deinen Zugangsdaten an
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fehler</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {info && (
          <Alert className="mb-4 bg-avanti-50 border-avanti-200">
            <Info className="h-4 w-4 text-avanti-600" />
            <AlertTitle className="text-avanti-700">Information</AlertTitle>
            <AlertDescription className="text-avanti-600">
              {info}
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Passwort</Label>
              <a 
                href="/auth/forgot-password" 
                className="text-sm text-avanti-600 hover:text-avanti-800"
              >
                Passwort vergessen?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-avanti-600 hover:bg-avanti-700" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Wird angemeldet...' : 'Anmelden'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col justify-center space-y-2">
        <p className="text-sm text-muted-foreground text-center">
          Nur für autorisierte Nutzer. Bitte kontaktiere deinen Administrator für Zugang.
        </p>
        <div className="text-xs text-center text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100">
          <p>Um dich anzumelden, benötigst du:</p>
          <ul className="list-disc list-inside mt-1">
            <li>Einen gültigen Benutzeraccount in Supabase</li>
            <li>Ein zugehöriges Profil in der "profiles" Tabelle</li>
          </ul>
        </div>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
