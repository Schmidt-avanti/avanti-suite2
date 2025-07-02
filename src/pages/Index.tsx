import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isLoading) return;

    // Check if this is coming from a magic link authentication
    // Magic links typically have the token in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    // Standard password reset token check (keep for backward compatibility)
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    // For debugging
    if (accessToken || refreshToken || token) {
      console.log("Auth tokens detected in URL", { 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken,
        token: !!token,
        type
      });
    }

    // If the user is already authenticated, proceed with role-based routing
    if (user) {
      // Routing basierend auf Rollen aus profile
      if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "agent") {
        navigate("/agent/dashboard", { replace: true });
      } else if (user.role === "customer") {
        navigate("/admin/customer-dashboard", { replace: true });
      } else {
        navigate("/error", { replace: true });
      }
      return;
    }

    // If not authenticated and no tokens, redirect to login
    if (!user && !accessToken && !token) {
      navigate("/auth/login", { replace: true });
      return;
    }
    
    // If tokens are present but no user yet, let the auth context handle it
    // The auth state listener will kick in once the tokens are processed
    
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
