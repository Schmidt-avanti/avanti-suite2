
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserRole, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
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
  
  // Ensure role is one of our allowed types
  if (!['admin', 'agent', 'client'].includes(role)) {
    console.warn(`Invalid role found in profile: ${role}, defaulting to 'client'`);
  }
  
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: (['admin', 'agent', 'client'].includes(role) ? role : 'client') as UserRole,
    createdAt: session.user.created_at,
    firstName: profileData["Full Name"] || undefined,
    lastName: undefined,
  };
};

export function useProvideAuth(): AuthState {
  const [user, setUser] = useState<(User & { role: UserRole }) | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const sessionRefreshInterval = useRef<number | null>(null);

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

  // Function to update session timestamp for presence tracking
  const updateSessionTimestamp = async () => {
    if (!session?.user?.id) return;
    
    try {
      // Use direct database query with error handling
      const { error } = await supabase
        .from('user_sessions')
        .upsert({ 
          user_id: session.user.id,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.error("Error refreshing session:", error);
      } else {
        console.log("Session refreshed");
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
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
          // Clear session refresh interval
          if (sessionRefreshInterval.current) {
            clearInterval(sessionRefreshInterval.current);
            sessionRefreshInterval.current = null;
          }
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
              const mappedUser = await loadProfileAndSetUser(newSession);
              
              // Start session refresh interval only on successful login
              if (mappedUser && !sessionRefreshInterval.current) {
                updateSessionTimestamp(); // Initial update
                sessionRefreshInterval.current = window.setInterval(() => {
                  updateSessionTimestamp();
                }, 5 * 60 * 1000); // Update every 5 minutes
              }
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
            const mappedUser = await loadProfileAndSetUser(initialSession);
            
            // Start session refresh interval if user is loaded successfully
            if (mappedUser && !sessionRefreshInterval.current) {
              updateSessionTimestamp(); // Initial update
              sessionRefreshInterval.current = window.setInterval(() => {
                updateSessionTimestamp();
              }, 5 * 60 * 1000); // Update every 5 minutes
            }
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
      
      // Clear interval on unmount
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current);
        sessionRefreshInterval.current = null;
      }
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
      // Clear the session refresh interval
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current);
        sessionRefreshInterval.current = null;
      }
      
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
