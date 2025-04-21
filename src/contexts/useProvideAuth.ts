
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

const fetchUserProfile = async (userId: string) => {
  console.log("Fetching profile for user ID:", userId);
  
  try {
    // Direkte SQL-Abfrage ohne Rekursion zu verhindern
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
  } catch (error) {
    console.error("Error in fetchUserProfile:", error);
    throw error;
  }
};

export function useProvideAuth(): AuthState {
  const [user, setUser] = useState<(User & { role: UserRole }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
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
              role: (profile.role || "client") as UserRole,
              createdAt: session.user.created_at,
              firstName: profile["Full Name"] || undefined,
              lastName: undefined,
            });
            setIsLoading(false);
          }
        } catch (err) {
          console.error("Failed to fetch profile during initialization:", err);
          
          toast({
            variant: "destructive",
            title: "Profil konnte nicht geladen werden",
            description: "Dein Profil konnte nicht gefunden werden. Bitte kontaktiere deinen Administrator.",
          });
          
          try {
            await supabase.auth.signOut();
          } catch (signOutErr) {
            console.error("Error signing out:", signOutErr);
          } finally {
            if (mounted) {
              setUser(null);
              setIsLoading(false);
            }
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Auth-Statusänderungslistener von Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Einen kleinen Verzögerung einbauen, um eventuelle Race-Conditions zu vermeiden
        setTimeout(() => {
          if (!mounted) return;
          
          fetchUserProfile(session.user.id)
            .then(profile => {
              if (mounted) {
                setUser({
                  id: session.user.id,
                  email: session.user.email ?? "",
                  role: (profile.role || "client") as UserRole,
                  createdAt: session.user.created_at,
                  firstName: profile["Full Name"] || undefined,
                  lastName: undefined,
                });
                setIsLoading(false);
              }
            })
            .catch(err => {
              console.error("Failed to fetch profile after auth event:", err);
              
              toast({
                variant: "destructive",
                title: "Profil konnte nicht geladen werden",
                description: "Dein Profil konnte nicht gefunden werden. Bitte kontaktiere deinen Administrator.",
              });
              
              supabase.auth.signOut()
                .finally(() => {
                  if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                  }
                });
            });
        }, 100);
      }
    });

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
        if (error?.message.includes("Invalid login credentials")) {
          throw new Error("Falsche E-Mail oder falsches Passwort. Bitte versuche es erneut.");
        }
        throw error;
      }
      
      console.log("Authentication successful for user:", data.session.user.id);
      
      // Note: Wir laden das Profil nicht explizit, da der auth state change listener
      // automatisch das Profil lädt und den Benutzer setzt
      
      toast({
        title: "Login erfolgreich",
        description: "Willkommen zurück!",
      });
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
        description: "Du wurdest erfolgreich abgemeldet.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Abmeldung fehlgeschlagen",
        description: "Es gab ein Problem bei der Abmeldung. Bitte versuche es erneut.",
      });
    }
  };

  return { user, isLoading, signIn, signOut };
}
