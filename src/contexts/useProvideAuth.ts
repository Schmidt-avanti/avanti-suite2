
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserRole, User } from "@/types";
import { useToast } from "@/components/ui/use-toast";

export interface AuthState {
  user: (User & { role: UserRole }) | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Hilfsfunction, um Profilfehler zu protokollieren
const logProfileError = (error: any, message: string) => {
  console.error(`${message}:`, error);
  console.error("Error details:", {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code
  });
};

export function useProvideAuth(): AuthState {
  const [user, setUser] = useState<(User & { role: UserRole }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Funktion zum Abrufen des Benutzerprofils
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user ID:", userId);
      
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, \"Full Name\"")
        .eq("id", userId)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      console.log("Profile data received:", profile);
      
      if (!profile) {
        throw new Error("Profil nicht gefunden");
      }
      
      return profile;
    } catch (error) {
      logProfileError(error, "Profile fetch error");
      throw error;
    }
  };

  // Load session and handle user+role
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        console.log("Initializing auth state...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log("No active session");
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        console.log("Session found for user:", session.user.id);
        
        try {
          const profile = await fetchUserProfile(session.user.id);
          
          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
            role: (profile.role || "customer") as UserRole,
            createdAt: session.user.created_at,
            firstName: profile["Full Name"] || undefined,
            lastName: undefined,
          });
        } catch (err) {
          logProfileError(err, "Failed to fetch profile during initialization");
          
          toast({
            variant: "destructive",
            title: "Profil konnte nicht geladen werden",
            description: "Ihr Profil konnte nicht gefunden werden. Bitte kontaktieren Sie Ihren Administrator.",
          });
          
          try {
            await supabase.auth.signOut();
          } finally {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Verwenden von setTimeout, um einen Deadlock im Auth-Listener zu vermeiden
      setTimeout(async () => {
        setIsLoading(true);
        try {
          const profile = await fetchUserProfile(session.user.id);
          
          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
            role: (profile.role || "customer") as UserRole,
            createdAt: session.user.created_at,
            firstName: profile["Full Name"] || undefined,
            lastName: undefined,
          });
        } catch (err) {
          logProfileError(err, "Failed to fetch profile during auth state change");
          
          toast({
            variant: "destructive",
            title: "Profil konnte nicht geladen werden",
            description: "Ihr Profil konnte nicht gefunden werden. Bitte kontaktieren Sie Ihren Administrator.",
          });
          
          try {
            await supabase.auth.signOut();
          } finally {
            setUser(null);
          }
        } finally {
          setIsLoading(false);
        }
      }, 0);
    });

    void init();

    return () => subscription.unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log(`Attempting to sign in user: ${email}`);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error || !data.session?.user) {
        console.error("Sign in error:", error);
        toast({
          variant: "destructive",
          title: "Login fehlgeschlagen",
          description: error?.message || "Falsche Zugangsdaten.",
        });
        throw error;
      }
      
      console.log("Authentication successful, fetching profile...");
      
      try {
        const profile = await fetchUserProfile(data.session.user.id);
        
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
      } catch (err) {
        logProfileError(err, "Failed to fetch profile after sign in");
        
        toast({
          variant: "destructive",
          title: "Profil fehlt",
          description: "Es existiert kein Profil für diesen Nutzer / Rolle. Bitte kontaktieren Sie Ihren Administrator.",
        });
        
        await supabase.auth.signOut();
        throw new Error("Profil fehlt");
      }
    } catch (error) {
      console.error("Sign in process failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast({
        title: "Abgemeldet",
        description: "Sie wurden erfolgreich abgemeldet.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Abmeldung fehlgeschlagen",
        description: "Es gab ein Problem bei der Abmeldung. Bitte versuchen Sie es erneut.",
      });
    }
  };

  return { user, isLoading, signIn, signOut };
}
