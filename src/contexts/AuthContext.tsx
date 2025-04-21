
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { UserRole, User } from '@/types';
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: (User & { role: UserRole }) | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
          // Direkte Abfrage, ohne RLS Policies zu verwenden, die rekursiv sind
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role, \"Full Name\"")
            .eq("id", session.user.id)
            .maybeSingle();
          
          if (!profile || error) {
            console.error("Profile fetch error:", error);
            toast({
              variant: "destructive",
              title: "Profil konnte nicht geladen werden",
              description: error?.message || "Ihr Profil konnte nicht gefunden werden. Bitte kontaktieren Sie Ihren Administrator.",
            });
            // Auto-Logout bei fehlendem Profil
            await supabase.auth.signOut();
            setUser(null);
          } else {
            setUser({
              id: session.user.id,
              email: session.user.email ?? "",
              role: (profile.role || "customer") as UserRole, // fallback auf customer
              createdAt: session.user.created_at,
              firstName: profile["Full Name"] || undefined,
              lastName: undefined,
            });
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
          // Auto-Logout bei Fehler
          await supabase.auth.signOut();
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
        // Profil abfragen ohne RLS Policies zu verwenden
        supabase
          .from("profiles")
          .select("role, \"Full Name\"")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(async ({ data: profile, error }) => {
            if (!profile || error) {
              console.error("Profile fetch error in auth state change:", error);
              toast({
                variant: "destructive",
                title: "Profil konnte nicht geladen werden",
                description: error?.message || "Ihr Profil konnte nicht gefunden werden. Bitte kontaktieren Sie Ihren Administrator.",
              });
              // Auto-Logout bei fehlendem Profil
              await supabase.auth.signOut();
              setUser(null);
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email ?? "",
                role: (profile.role || "customer") as UserRole,
                createdAt: session.user.created_at,
                firstName: profile["Full Name"] || undefined,
                lastName: undefined,
              });
            }
            setIsLoading(false);
          })
          .catch(async (err) => {
            console.error("Profile fetch error:", err);
            // Auto-Logout bei Fehler
            await supabase.auth.signOut();
            setUser(null);
            setIsLoading(false);
          });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });
    init();

    return () => subscription.unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
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

      // Profile + Rolle nachloggen ohne RLS Policies zu verwenden
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, \"Full Name\"")
          .eq("id", data.session.user.id)
          .maybeSingle();

        if (!profile || profileError) {
          console.error("Profile fetch error in signIn:", profileError);
          toast({
            variant: "destructive",
            title: "Profil fehlt",
            description: "Es existiert kein Profil für diesen Nutzer / Rolle. Bitte kontaktieren Sie Ihren Administrator.",
          });
          await supabase.auth.signOut(); // Auto logout bei fehlendem Profil
          setIsLoading(false);
          throw new Error("Profil fehlt");
        }

        setUser({
          id: data.session.user.id,
          email: data.session.user.email ?? "",
          role: (profile.role || "customer") as UserRole,
          createdAt: data.session.user.created_at,
          firstName: profile["Full Name"] || undefined,
          lastName: undefined,
        });
        
        toast({
          title: "Login erfolgreich",
          description: "Willkommen zurück!",
        });
      } catch (error) {
        console.error("Profile fetch error:", error);
        // Auto-Logout bei Fehler
        await supabase.auth.signOut();
        setUser(null);
        throw error;
      }
    } catch (error) {
      console.error("Sign in error:", error);
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
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
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
