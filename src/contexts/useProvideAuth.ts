
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

export function useProvideAuth(): AuthState {
  const [user, setUser] = useState<(User & { role: UserRole }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Load session and handle user+role
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          // No RLS checks on this query (guard against recursion)
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
            // Auto-logout
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
        } catch (err) {
          console.error("Profile fetch error:", err);
          await supabase.auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    // Supabase auth state change listener, all with async logic wrapped
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoading(true);

        const fetchUserProfile = async () => {
          try {
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("role, \"Full Name\"")
              .eq("id", session.user.id)
              .maybeSingle();

            if (!profile || error) {
              console.error("Profile fetch error in auth state change:", error);
              toast({
                variant: "destructive",
                title: "Profil konnte nicht geladen werden",
                description: error?.message || "Ihr Profil konnte nicht gefunden werden. Bitte kontaktieren Sie Ihren Administrator.",
              });
              try {
                await supabase.auth.signOut();
                setUser(null);
                setIsLoading(false);
              } catch (logoutError) {
                console.error("Logout failed:", logoutError);
                setUser(null);
                setIsLoading(false);
              }
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email ?? "",
                role: (profile.role || "customer") as UserRole,
                createdAt: session.user.created_at,
                firstName: profile["Full Name"] || undefined,
                lastName: undefined,
              });
              setIsLoading(false);
            }
          } catch (err) {
            console.error("Profile fetch error:", err);
            try {
              await supabase.auth.signOut();
              setUser(null);
              setIsLoading(false);
            } catch (logoutError) {
              console.error("Logout failed:", logoutError);
              setUser(null);
              setIsLoading(false);
            }
          }
        };

        void fetchUserProfile();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    void init();

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
          await supabase.auth.signOut();
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

  return { user, isLoading, signIn, signOut };
}
