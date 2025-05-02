
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Fehlende Angaben",
        description: "Bitte geben Sie E-Mail und Passwort ein.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login fehlgeschlagen",
        description: error.message || "Bitte überprüfen Sie Ihre Zugangsdaten.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // URL hash check for password reset
  React.useEffect(() => {
    const hash = window.location.hash;
    const type = new URLSearchParams(hash.substring(1)).get("type");
    
    if (type === "recovery") {
      toast({
        title: "Passwort zurücksetzen",
        description: "Bitte setzen Sie ein neues Passwort für Ihr Konto.",
      });
    } else if (window.location.pathname.includes("reset-password")) {
      toast({
        title: "Passwort zurücksetzen",
        description: "Bitte setzen Sie ein neues Passwort für Ihr Konto.",
      });
    }
  }, [toast]);

  return (
    <Card className="p-6 shadow-lg rounded-xl">
      <h1 className="text-2xl font-semibold text-center mb-6">Anmelden</h1>
      
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
            autoComplete="username"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Passwort</Label>
            <Link 
              to="/auth/forgot-password" 
              className="text-sm text-avanti-600 hover:text-avanti-800"
            >
              Passwort vergessen?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Anmeldung...
            </>
          ) : (
            "Anmelden"
          )}
        </Button>
      </form>
    </Card>
  );
};

export default LoginForm;
