
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-avanti-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect based on user role
  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.role === 'agent') {
    return <Navigate to="/agent/dashboard" replace />;
  } else if (user.role === 'customer') {
    return <Navigate to="/customer/dashboard" replace />;
  }

  // Fallback
  return <Navigate to="/" replace />;
};

export default Index;
