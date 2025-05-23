import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupervisorChatProvider } from "@/contexts/SupervisorChatContext";
import { ThemeProvider } from "@/components/ui/theme";

// Layout
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// Auth Pages
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

// Dashboard Page
import Dashboard from "@/pages/Dashboard";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import UsersAdminPage from "@/pages/admin/Users";
import CustomersAdminPage from "@/pages/admin/Customers";
import UseCasesPage from "@/pages/admin/UseCases";
import CreateUseCasePage from "@/pages/admin/CreateUseCase";
import PromptTemplatesPage from "@/pages/admin/PromptTemplates";
import UseCaseDetailPage from "@/pages/admin/UseCaseDetailPage";
import CreateKnowledgeArticle from "@/pages/admin/CreateKnowledgeArticle";
import WhatsappAccountsAdminPage from "@/pages/admin/WhatsappAccounts";
import ProcessingTimeRedirect from "@/pages/admin/ProcessingTime";

// Supervisor Pages
import LiveAgentOverview from "@/pages/supervisor/LiveAgentOverview";
import ShortBreakSettings from "@/pages/supervisor/ShortBreakSettings";
import ProcessingTime from "@/pages/supervisor/ProcessingTime";

// Agent Pages
import AgentDashboard from "@/pages/agent/Dashboard";

// Client Pages
import ClientDashboard from "@/pages/customer/Dashboard";

// Task Pages
import CreateTask from "@/pages/tasks/CreateTask";
import Tasks from '@/pages/tasks/Tasks';
import TaskDetail from "./pages/tasks/TaskDetail";
import CompletedTasks from './pages/tasks/CompletedTasks';

// Report Pages
import Reports from "@/pages/reports/Reports";

// Accounting Pages
import InvoicesPage from "@/pages/accounting/InvoicesPage";
import PaymentDataPage from "@/pages/accounting/PaymentDataPage";

// Public Pages
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Knowledge from '@/pages/Knowledge';
import KnowledgeArticleEdit from '@/components/knowledge/KnowledgeArticleEdit';
import WhatsappPage from "@/pages/Whatsapp";
import CallCenter from '@/pages/CallCenter';

// Use a single instance of QueryClient for the entire app
const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <SupervisorChatProvider>
            <Toaster />
            <Sonner />
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                
                {/* Important: The reset password route must be outside of the protected routes */}
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                
                {/* Entferne Registrierung, leite ggf. weiter */}
                <Route path="/auth/register" element={<Navigate to="/auth/login" replace />} />

                {/* Admin routes, geschützt */}
                <Route element={<AppLayout />}>
                  {/* Main Dashboard for all users */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent", "customer"]}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  
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
                    path="/admin/processing-time"
                    element={<ProcessingTimeRedirect />}
                  />

                  {/* Supervisor Pages */}
                  <Route
                    path="/supervisor/live-agents"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <LiveAgentOverview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/short-breaks"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <ShortBreakSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/processing-time"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <ProcessingTime />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/knowledge"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent", "customer"]}>
                        <Knowledge />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/knowledge/edit/:id"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "customer"]}>
                        <KnowledgeArticleEdit />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/whatsapp-accounts"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <WhatsappAccountsAdminPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Accounting routes */}
                  <Route
                    path="/accounting/invoices"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <InvoicesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounting/payment-data"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "customer"]}>
                        <PaymentDataPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Reports page */}
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent", "customer"]}>
                        <Reports />
                      </ProtectedRoute>
                    }
                  />

                  {/* Agent routes */}
                  <Route
                    path="/agent/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["agent"]}>
                        <AgentDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Client routes */}
                  <Route
                    path="/client/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["customer"]}>
                        <ClientDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/meine-aufgaben"
                    element={
                      <ProtectedRoute allowedRoles={["customer"]}>
                        <Navigate to="/client/dashboard" replace />
                      </ProtectedRoute>
                    }
                  />

                  {/* Task routes - WICHTIG: Spezifischere Routen zuerst, dann dynamische */}
                  <Route
                    path="/tasks/completed"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent", "customer"]}>
                        <CompletedTasks />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tasks/create"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent", "customer"]}>
                        <CreateTask />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tasks"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent", "customer"]}>
                        <Tasks />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tasks/:id"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent", "customer"]}>
                        <TaskDetail />
                      </ProtectedRoute>
                    }
                  />

                  {/* WhatsApp Integration */}
                  <Route
                    path="/whatsapp"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent"]}>
                        <WhatsappPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Call Center Integration */}
                  <Route
                    path="/call-center"
                    element={
                      <ProtectedRoute allowedRoles={["admin", "agent"]}>
                        <CallCenter />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all for unauthorized */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Router>
          </SupervisorChatProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
