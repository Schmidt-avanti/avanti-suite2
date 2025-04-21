
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = ["admin", "agent", "customer"],
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-avanti-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Rolle stimmt nicht für Bereich! → harte Weiterleitung nach Startseite
    if (user.role === 'admin') {
      return <Navigate to="/admin/users" replace />;
    } else if (user.role === 'agent') {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role === 'customer') {
      return <Navigate to="/meine-aufgaben" replace />;
    }
    return <Navigate to="/error" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
