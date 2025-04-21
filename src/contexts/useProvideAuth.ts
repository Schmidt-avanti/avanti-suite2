
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

// Verbesserte Funktion zum Abrufen des Benutzerprofils mit detaillierter Fehlerbehandlung
const fetchUserProfile = async (userId: string) => {
  console.log("Fetching profile for user ID:", userId);
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, \"Full Name\"")
    .eq("id", userId)
    .maybeSingle();
  
  if (error) {
    console.error("Profile fetch error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Profilabruf fehlgeschlagen: ${error.message}`);
  }
  
  if (!profile) {
    console.error("No profile found for user ID:", userId);
    throw new Error("Kein Profil gefunden");
  }
  
  console.log("Profile successfully fetched:", profile);
  return profile;
};

export function useProvideAuth(): AuthState {
  const [user, setUser] = useState<(User & { role: UserRole }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Session laden und Benutzer + Rolle verarbeiten
  useEffect(() => {
    let mounted = true;
    
    const loadSession = async () => {
      try {
        console.log("Initializing auth state...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log("No active session");
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        
        console.log("Session found for user:", session.user.id);
        
        try {
          const profile = await fetchUserProfile(session.user.id);
          
          if (mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email ?? "",
              role: (profile.role || "customer") as UserRole,
              createdAt: session.user.created_at,
              firstName: profile["Full Name"] || undefined,
              lastName: undefined,
            });
          }
        } catch (err) {
          console.error("Failed to fetch profile during initialization:", err);
          
          toast({
            variant: "destructive",
            title: "Profil konnte nicht geladen werden",
            description: "Ihr Profil konnte nicht gefunden werden. Bitte kontaktieren Sie Ihren Administrator.",
          });
          
          await supabase.auth.signOut();
          if (mounted) {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Auth-Statusänderungslistener von Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Verwenden von setTimeout, um einen Deadlock im Auth-Listener zu vermeiden
      setTimeout(async () => {
        if (!mounted) return;
        
        setIsLoading(true);
        try {
          const profile = await fetchUserProfile(session.user.id);
          
          if (mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email ?? "",
              role: (profile.role || "customer") as UserRole,
              createdAt: session.user.created_at,
              firstName: profile["Full Name"] || undefined,
              lastName: undefined,
            });
          }
        } catch (err) {
          console.error("Failed to fetch profile during auth state change:", err);
          
          toast({
            variant: "destructive",
            title: "Profil konnte nicht geladen werden",
            description: "Ihr Profil konnte nicht gefunden werden. Bitte kontaktieren Sie Ihren Administrator.",
          });
          
          try {
            await supabase.auth.signOut();
          } finally {
            if (mounted) {
              setUser(null);
            }
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      }, 0);
    });

    void loadSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log(`Attempting to sign in user: ${email}`);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error || !data.session?.user) {
        console.error("Sign in error:", error);
        throw error;
      }
      
      console.log("Authentication successful for user:", data.session.user.id);
      
      try {
        const profile = await fetchUserProfile(data.session.user.id);
        
        console.log("Profile retrieved successfully:", profile);
        
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
      } catch (err: any) {
        console.error("Failed to fetch profile after sign in:", err);
        
        toast({
          variant: "destructive",
          title: "Profil fehlt",
          description: "Es existiert kein Profil für diesen Nutzer. Bitte kontaktieren Sie Ihren Administrator.",
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
