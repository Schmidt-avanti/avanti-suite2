
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Layout
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// Auth Pages
import Login from "@/pages/auth/Login";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import UsersAdminPage from "@/pages/admin/Users";

// Agent Pages
import AgentDashboard from "@/pages/agent/Dashboard";

// Client Pages
import ClientDashboard from "@/pages/customer/Dashboard";

// Public Pages
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            {/* Entferne Registrierung, leite ggf. weiter */}
            <Route path="/auth/register" element={<Navigate to="/auth/login" replace />} />

            {/* Admin routes, geschützt */}
            <Route element={<AppLayout />}>
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <UsersAdminPage />
                  </ProtectedRoute>
                }
              />

              {/* Agent routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["agent"]}>
                    <AgentDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Client routes */}
              <Route
                path="/meine-aufgaben"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all for unauthorized */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
