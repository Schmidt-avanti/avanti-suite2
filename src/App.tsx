import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Layout
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// Auth Pages
import Login from "@/pages/auth/Login";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import UsersAdminPage from "@/pages/admin/Users";
import CustomersAdminPage from "@/pages/admin/Customers";
import UseCasesPage from "@/pages/admin/UseCases";
import CreateUseCasePage from "@/pages/admin/CreateUseCase";
import PromptTemplatesPage from "@/pages/admin/PromptTemplates";
import UseCaseDetailPage from "@/pages/admin/UseCaseDetailPage";
import CreateKnowledgeArticle from "@/pages/admin/CreateKnowledgeArticle";

// Agent Pages
import AgentDashboard from "@/pages/agent/Dashboard";

// Client Pages
import ClientDashboard from "@/pages/customer/Dashboard";

// Task Pages
import CreateTask from "@/pages/tasks/CreateTask";
import Tasks from '@/pages/tasks/Tasks';
import TaskDetail from "./pages/tasks/TaskDetail";

// Public Pages
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Knowledge from '@/pages/Knowledge';
import KnowledgeArticleEdit from '@/components/knowledge/KnowledgeArticleEdit';
import Reports from '@/pages/reports/Reports';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Router>
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
                <Route
                  path="/admin/customers"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <CustomersAdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/use-cases"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <UseCasesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/use-cases/:id"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <UseCaseDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/use-cases/create"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <CreateUseCasePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/prompts"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <PromptTemplatesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/knowledge-articles/create/:useCaseId"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <CreateKnowledgeArticle />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/knowledge"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "agent"]}>
                      <Knowledge />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/knowledge/edit/:id"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "client"]}>
                      <KnowledgeArticleEdit />
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

                {/* Add new task routes */}
                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "agent", "client"]}>
                      <Tasks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks/create"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "agent", "client"]}>
                      <CreateTask />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks/:id"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "agent", "client"]}>
                      <TaskDetail />
                    </ProtectedRoute>
                  }
                />

                {/* Add Reports route */}
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "agent"]}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all for unauthorized */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
