
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isLoading) return;

    // Check if this is a password recovery session by checking for token and type
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const isRecoverySession = token && type === 'recovery';
    
    // If this is a recovery session, redirect to reset password page
    if (isRecoverySession) {
      // Pass along the token and type as search params
      navigate(`/auth/reset-password?token=${token}&type=${type}`, { replace: true });
      return;
    }

    // Normal authentication flow
    if (!user) {
      navigate("/auth/login", { replace: true });
      return;
    }

    // Routing basierend auf Rollen aus profile
    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    } else if (user.role === "agent") {
      navigate("/agent/dashboard", { replace: true });
    } else if (user.role === "customer") {
      navigate("/meine-aufgaben", { replace: true });
    } else {
      navigate("/error", { replace: true });
    }
  }, [user, isLoading, navigate, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-avanti-600"></div>
      </div>
    );
  }

  return null;
};

export default Index;
