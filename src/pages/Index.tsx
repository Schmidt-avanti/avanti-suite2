
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth/login", { replace: true });
      return;
    }

    // Routing basierend auf Rollen aus profile
    if (user.role === "admin") {
      navigate("/admin/users", { replace: true });
    } else if (user.role === "agent") {
      navigate("/dashboard", { replace: true });
    } else if (user.role === "customer") {
      navigate("/meine-aufgaben", { replace: true });
    } else {
      navigate("/error", { replace: true });
    }
  }, [user, isLoading, navigate]);

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
