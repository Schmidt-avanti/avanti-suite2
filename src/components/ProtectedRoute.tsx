
import React, { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
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
  const { user, session, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Special handling for reset password page
  const isResetPasswordPath = location.pathname === "/auth/reset-password";

  useEffect(() => {
    // Double-check session validity
    if (!isLoading && !session) {
      console.log("No valid session detected in protected route");
    }
  }, [isLoading, session]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-avanti-600"></div>
      </div>
    );
  }

  // Special handling for reset password page - allow access even without auth
  if (isResetPasswordPath) {
    return <>{children}</>;
  }

  if (!session || !user) {
    console.log("Redirecting to login: No session or user");
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    console.log(`User role '${user.role}' not authorized for this route. Allowed roles:`, allowedRoles);
    
    // Rolle stimmt nicht für Bereich! → immer Weiterleitung nach allgemeinem Dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
