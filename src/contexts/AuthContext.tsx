
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '@/types';
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Mock authentication for now - will be replaced with Supabase
  useEffect(() => {
    // Check for user in localStorage (simulating persistence)
    const storedUser = localStorage.getItem('avanti-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // This will be replaced with actual Supabase authentication
      // Mock successful login with a fake user
      const mockUser: User = {
        id: '1',
        email,
        role: 'agent',
        firstName: 'Demo',
        lastName: 'User',
        createdAt: new Date().toISOString()
      };
      
      setUser(mockUser);
      localStorage.setItem('avanti-user', JSON.stringify(mockUser));
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Please check your credentials and try again.",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, role: UserRole) => {
    try {
      setIsLoading(true);
      // This will be replaced with actual Supabase registration
      // Mock successful registration
      const mockUser: User = {
        id: '1',
        email,
        role,
        createdAt: new Date().toISOString()
      };
      
      setUser(mockUser);
      localStorage.setItem('avanti-user', JSON.stringify(mockUser));
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: "An error occurred during registration.",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // This will be replaced with actual Supabase logout
      setUser(null);
      localStorage.removeItem('avanti-user');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "An error occurred during logout.",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
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
