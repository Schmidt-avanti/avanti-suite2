import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupervisorChatProvider } from "@/contexts/SupervisorChatContext";
import { TaskSessionProvider } from "@/contexts/TaskSessionContext";
import { ThemeProvider } from "@/components/ui/theme";

// Layout
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import CustomerRedirect from "@/components/CustomerRedirect";

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
import EndkundenAdminPage from "@/pages/admin/Endkunden";
import EndkundenKontaktePage from "@/pages/admin/EndkundenKontakte";
import DevelopmentPage from "@/pages/admin/Development";
import NewUseCaseList from "@/pages/admin/NewUseCaseList";
import NewUseCaseDetail from "@/pages/admin/NewUseCaseDetail";
import NewUseCaseForm from "@/pages/admin/NewUseCaseForm";
import ModernFlowTest from '@/pages/admin/ModernFlowTest';
import IntelligentDialogCreatorTest from '@/pages/admin/IntelligentDialogCreatorTest';

// Supervisor Pages
import LiveAgentOverview from "@/pages/supervisor/LiveAgentOverview";
import ShortBreakSettings from "@/pages/supervisor/ShortBreakSettings";
import ProcessingTime from "@/pages/supervisor/ProcessingTime";

// Agent Pages
import AgentDashboard from "@/pages/agent/Dashboard";

// Client Pages
import ClientDashboard from "@/pages/customer/Dashboard";
import CustomerDashboard from "@/pages/customer/CustomerDashboard";

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
import ProductsPage from "@/pages/accounting/Products";
import ProductOptionsPage from "@/pages/accounting/ProductOptions";

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <TaskSessionProvider>
              <SupervisorChatProvider>
                <Router>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/landing" element={<Landing />} />

                  {/* Protected routes */}
                  <Route element={<AppLayout />}>
                    {/* Role-based dashboard redirect */}
                    <Route
                      path="/dashboard-redirect"
                      element={<CustomerRedirect />}
                    />
                    
                    {/* Knowledge route for all roles (with sidebar) */}
                    <Route
                      path="/knowledge"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent', 'customer']}>
                          <Knowledge />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent']}>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Admin */}
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route
                      path="/admin/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <UsersAdminPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/customers"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <CustomersAdminPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/use-cases"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'customer']}>
                          <UseCasesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/use-cases/create"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'customer']}>
                          <CreateUseCasePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/use-cases/:id"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'customer']}>
                          <UseCaseDetailPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/prompt-templates"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <PromptTemplatesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/knowledge/create"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <CreateKnowledgeArticle />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/whatsapp-accounts"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <WhatsappAccountsAdminPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/processing-time"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <ProcessingTimeRedirect />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/endkunden"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent', 'customer']}>
                          <EndkundenAdminPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/endkunden-kontakte"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent', 'customer']}>
                          <EndkundenKontaktePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/development"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <DevelopmentPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/new-use-cases"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <NewUseCaseList />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/new-use-cases/new"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <NewUseCaseForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/new-use-cases/:id"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <NewUseCaseDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/modern-flow-test"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <ModernFlowTest />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/intelligent-dialog-test"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <IntelligentDialogCreatorTest />
                        </ProtectedRoute>
                      }
                    />

                    {/* Supervisor */}
                    <Route
                      path="/supervisor/live-overview"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                          <LiveAgentOverview />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/supervisor/short-break-settings"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                          <ShortBreakSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/supervisor/processing-time"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                          <ProcessingTime />
                        </ProtectedRoute>
                      }
                    />

                    {/* Agent */}
                    <Route
                      path="/agent/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent']}>
                          <AgentDashboard />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Customer */}
                    <Route
                      path="/customer/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['customer']}>
                          <ClientDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/customer-dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'customer']}>
                          <CustomerDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Tasks */}
                    <Route
                      path="/tasks"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent', 'customer']}>
                          <Tasks />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tasks/create"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent']}>
                          <CreateTask />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tasks/completed"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent', 'customer']}>
                          <CompletedTasks />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tasks/:id"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent', 'customer']}>
                          <TaskDetail />
                        </ProtectedRoute>
                      }
                    />

                    {/* Reports */}
                    <Route
                      path="/reports"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'agent', 'customer']}>
                          <Reports />
                        </ProtectedRoute>
                      }
                    />

                    {/* Accounting */}
                    <Route
                      path="/accounting/invoices"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'customer']}>
                          <InvoicesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/accounting/payment-data"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'customer']}>
                          <PaymentDataPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/accounting/products"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <ProductsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/accounting/product-options"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <ProductOptionsPage />
                        </ProtectedRoute>
                      }
                    />
                  </Route>
                  
                  {/* Not Found */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Router>
              </SupervisorChatProvider>
            </TaskSessionProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
