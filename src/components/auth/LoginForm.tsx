
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Bitte geben Sie E-Mail und Passwort ein.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      await signIn(email, password);
      // Redirect based on role will be handled by the router
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message === 'Profil fehlt') {
        setError('Es existiert kein Profil für diesen Nutzer. Bitte kontaktieren Sie Ihren Administrator.');
      } else if (typeof error.message === 'string') {
        setError(error.message);
      } else {
        setError('Bei der Anmeldung ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
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
          Melden Sie sich mit Ihren Zugangsdaten an
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
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Nur für autorisierte Nutzer. Bitte kontaktieren Sie Ihren Administrator für Zugang.
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
