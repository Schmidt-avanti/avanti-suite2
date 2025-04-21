
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
import Register from "@/pages/auth/Register";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";

// Agent Pages
import AgentDashboard from "@/pages/agent/Dashboard";

// Customer Pages
import CustomerDashboard from "@/pages/customer/Dashboard";

// Public Pages
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";

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
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            {/* Protected routes inside AppLayout */}
            <Route element={<AppLayout />}>
              {/* Admin routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Agent routes */}
              <Route 
                path="/agent/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['agent']}>
                    <AgentDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Customer routes */}
              <Route 
                path="/customer/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Root redirect based on role */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Navigate to="/customer/dashboard" replace />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
