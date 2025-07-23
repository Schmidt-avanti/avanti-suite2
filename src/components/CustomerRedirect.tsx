import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Component that redirects users to their appropriate dashboard based on role
 */
const CustomerRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-avanti-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Redirect users to their appropriate dashboard based on role
  switch (user.role) {
    case 'customer':
      return <Navigate to="/admin/customer-dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'agent':
      return <Navigate to="/dashboard" replace />;
    default:
      return <Navigate to="/auth/login" replace />;
  }
};

export default CustomerRedirect;
