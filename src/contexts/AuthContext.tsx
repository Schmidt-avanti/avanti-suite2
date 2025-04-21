
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { UserRole, User } from '@/types';
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: (User & { role: UserRole }) | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>; // Added signUp method
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(User & { role: UserRole }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Initialisiere die Session + Rolle
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          if (!profile || error) {
            setUser(null);
          } else {
            setUser({
              id: session.user.id,
              email: session.user.email ?? "",
              role: (profile.role || "customer") as UserRole, // fallback auf customer
              createdAt: session.user.created_at,
              firstName: undefined,
              lastName: undefined,
            });
          }
        } catch (err) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    // Supabase onAuthStateChange Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoading(true);
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data: profile, error }) => {
            if (!profile || error) {
              setUser(null);
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email ?? "",
                role: (profile.role || "customer") as UserRole,
                createdAt: session.user.created_at,
                firstName: undefined,
                lastName: undefined,
              });
            }
            setIsLoading(false);
          });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });
    init();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session?.user) {
      toast({
        variant: "destructive",
        title: "Login fehlgeschlagen",
        description: error?.message || "Falsche Zugangsdaten.",
      });
      setIsLoading(false);
      throw error;
    }

    // Profile + Rolle nachloggen
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.session.user.id)
      .maybeSingle();

    if (!profile || profileError) {
      toast({
        variant: "destructive",
        title: "Profil fehlt",
        description: "Es existiert kein Profil für diesen Nutzer / Rolle.",
      });
      setIsLoading(false);
      throw new Error("Profil fehlt");
    }

    setUser({
      id: data.session.user.id,
      email: data.session.user.email ?? "",
      role: (profile.role || "customer") as UserRole,
      createdAt: data.session.user.created_at,
      firstName: undefined,
      lastName: undefined,
    });
    
    toast({
      title: "Login erfolgreich",
      description: "Willkommen zurück!",
    });
    setIsLoading(false);
  };

  // Add signUp implementation
  const signUp = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Register the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            role: role, // Store role in user_metadata
          },
        }
      });
      
      if (error || !data.user) {
        toast({
          variant: "destructive",
          title: "Registrierung fehlgeschlagen",
          description: error?.message || "Fehler bei der Erstellung des Accounts.",
        });
        throw error;
      }

      // Create profile entry for the user with the selected role
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          { 
            id: data.user.id, 
            role: role,
            "Full Name": email.split('@')[0] // Default name from email
          }
        ]);

      if (profileError) {
        toast({
          variant: "destructive",
          title: "Profil konnte nicht erstellt werden",
          description: profileError.message,
        });
        throw profileError;
      }

      toast({
        title: "Registrierung erfolgreich",
        description: "Ihr Account wurde erstellt. Sie können sich jetzt anmelden.",
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({
      title: "Abgemeldet",
      description: "Sie wurden erfolgreich abgemeldet.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
