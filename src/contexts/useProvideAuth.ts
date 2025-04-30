
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserRole, User } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { Session } from "@supabase/supabase-js";

export interface AuthState {
  user: (User & { role: UserRole }) | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Fetches a user profile safely without causing recursion
 */
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

/**
 * Maps a Supabase session user and profile data to our application User type
 */
const createUserFromSessionAndProfile = (session: Session, profileData: any): User & { role: UserRole } => {
  const role = (profileData.role || "client") as UserRole;
  const fullName = profileData["Full Name"] || "";
  const firstName = fullName.split(' ')[0] || "";
  
  // Ensure role is one of our allowed types
  if (!['admin', 'agent', 'client'].includes(role)) {
    console.warn(`Invalid role found in profile: ${role}, defaulting to 'client'`);
  }
  
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: (['admin', 'agent', 'client'].includes(role) ? role : 'client') as UserRole,
    createdAt: session.user.created_at,
    fullName: fullName,
    firstName: firstName,
    lastName: undefined,
    avatarUrl: session.user?.user_metadata?.avatar_url || undefined,
    name: fullName,
  };
};

export function useProvideAuth(): AuthState {
  const [user, setUser] = useState<(User & { role: UserRole }) | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Helper function to safely load profile data
  const loadProfileAndSetUser = async (session: Session) => {
    if (!session?.user) return null;
    
    try {
      const profile = await fetchUserProfile(session.user.id);
      const mappedUser = createUserFromSessionAndProfile(session, profile);
      setUser(mappedUser);
      return mappedUser;
    } catch (error: any) {
      console.error("Failed to load profile:", error.message);
      toast({
        variant: "destructive",
        title: "Profil konnte nicht geladen werden",
        description: "Dein Profil konnte nicht gefunden werden. Bitte kontaktiere deinen Administrator.",
      });
      return null;
    }
  };

  // Initialize auth state and set up listeners
  useEffect(() => {
    console.log("Initializing auth state...");
    let mounted = true;
    
    // Set up auth state change listener first to prevent race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state change event:", event, newSession?.user?.id);
        
        if (!mounted) return;
        
        // Process auth state changes
        if (event === 'SIGNED_OUT' || !newSession) {
          console.log("User signed out or session cleared");
          setUser(null);
          setSession(null);
          setIsLoading(false);
          return;
        }
        
        // Update the session immediately
        setSession(newSession);
        
        // For sign-in events, load profile with slight delay to prevent deadlocks
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Use setTimeout to break potential deadlocks in the Supabase client
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              await loadProfileAndSetUser(newSession);
            } catch (err) {
              console.error("Error loading profile after auth event:", err);
            } finally {
              setIsLoading(false);
            }
          }, 100);
        }
      }
    );
    
    // Then check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!initialSession) {
          console.log("No active session found during initialization");
          if (mounted) {
            setUser(null);
            setSession(null);
            setIsLoading(false);
          }
          return;
        }
        
        console.log("Initial session found for user:", initialSession.user.id);
        if (mounted) setSession(initialSession);
        
        if (mounted) {
          try {
            await loadProfileAndSetUser(initialSession);
          } catch (err) {
            console.error("Error loading profile during initialization:", err);
            // We'll let the error propagate to be handled by the caller
          } finally {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (mounted) setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    console.log(`Attempting to sign in user: ${email}`);
    setIsLoading(true);
    
    try {
      // Perform authentication
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      
      if (!data.session) {
        console.error("No session returned after successful authentication");
        throw new Error("Keine Sitzung nach erfolgreicher Authentifizierung.");
      }
      
      console.log("Authentication successful for user:", data.session.user.id);
      
      // We don't need to explicitly load the profile here as the auth state listener will handle it
      // This helps avoid race conditions
      
      toast({
        title: "Login erfolgreich",
        description: "Willkommen zurück!",
      });
      
      return;
    } catch (error: any) {
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
      setSession(null);
      
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

  return { user, session, isLoading, signIn, signOut };
}
