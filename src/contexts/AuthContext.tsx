
import React, { createContext, useContext } from "react";
import type { AuthState } from "./useProvideAuth";
import { useProvideAuth } from "./useProvideAuth";

/**
 * AuthContext shared for authentication state
 */
const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useProvideAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
