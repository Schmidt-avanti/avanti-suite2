import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Home, Phone, Menu, MessageSquare, BarChart3, ClipboardList, FileText, Settings, Users, Building, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function AppSidebar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "border-r h-screen bg-background fixed inset-y-0 flex-col z-30 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between py-3 px-4">
        <Link to="/dashboard" className="flex items-center space-x-2 font-bold">
          <Bot size={24} />
          {!isCollapsed && <span>Avanti AI</span>}
        </Link>
        <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex flex-col space-y-1 flex-grow overflow-y-auto p-2 scrollbar-thin">
        {/* Admin Navigation */}
        {user?.role === "admin" && (
          <>
            <Link
              to="/admin/dashboard"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/admin/dashboard"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Home size={20} className="shrink-0" />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              to="/admin/users"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/admin/users"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Users size={20} className="shrink-0" />
              {!isCollapsed && <span>Users</span>}
            </Link>
            <Link
              to="/admin/customers"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/admin/customers"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Building size={20} className="shrink-0" />
              {!isCollapsed && <span>Customers</span>}
            </Link>
            <Link
              to="/admin/use-cases"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname.startsWith("/admin/use-cases")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare size={20} className="shrink-0" />
              {!isCollapsed && <span>Use Cases</span>}
            </Link>
            <Link
              to="/admin/prompts"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/admin/prompts"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText size={20} className="shrink-0" />
              {!isCollapsed && <span>Prompt Templates</span>}
            </Link>
            <Link
              to="/admin/whatsapp-accounts"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/admin/whatsapp-accounts"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare size={20} className="shrink-0" />
              {!isCollapsed && <span>WhatsApp Accounts</span>}
            </Link>
            <Link
              to="/supervisor/live-agents"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/supervisor/live-agents"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Users size={20} className="shrink-0" />
              {!isCollapsed && <span>Live Agents</span>}
            </Link>
            <Link
              to="/supervisor/short-breaks"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/supervisor/short-breaks"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <ClipboardList size={20} className="shrink-0" />
              {!isCollapsed && <span>Short Breaks</span>}
            </Link>
            <Link
              to="/supervisor/processing-time"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/supervisor/processing-time"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 size={20} className="shrink-0" />
              {!isCollapsed && <span>Processing Time</span>}
            </Link>

            {/* Call Center Link - Added for Admin */}
            <Link
              to="/call-center"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/call-center" 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Phone size={20} className="shrink-0" />
              {!isCollapsed && <span>Call Center</span>}
            </Link>

            <Link
              to="/reports"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/reports"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 size={20} className="shrink-0" />
              {!isCollapsed && <span>Reports</span>}
            </Link>
            <Link
              to="/accounting/invoices"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/accounting/invoices"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText size={20} className="shrink-0" />
              {!isCollapsed && <span>Invoices</span>}
            </Link>
          </>
        )}

        {/* Agent Navigation */}
        {user?.role === "agent" && (
          <>
            <Link
              to="/agent/dashboard"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/agent/dashboard"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Home size={20} className="shrink-0" />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              to="/tasks"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname.startsWith("/tasks")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <ClipboardList size={20} className="shrink-0" />
              {!isCollapsed && <span>Tasks</span>}
              {/* Show number of pending tasks as badge */}
              {/* {pendingTasks > 0 && !isCollapsed && (
                <Badge variant="secondary">{pendingTasks}</Badge>
              )} */}
            </Link>
            <Link
              to="/knowledge"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname.startsWith("/knowledge")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare size={20} className="shrink-0" />
              {!isCollapsed && <span>Knowledge</span>}
            </Link>
            <Link
              to="/whatsapp"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/whatsapp"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare size={20} className="shrink-0" />
              {!isCollapsed && <span>WhatsApp</span>}
            </Link>

            {/* Call Center Link - Added for Agent */}
            <Link
              to="/call-center"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/call-center" 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Phone size={20} className="shrink-0" />
              {!isCollapsed && <span>Call Center</span>}
            </Link>

            <Link
              to="/reports"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/reports"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 size={20} className="shrink-0" />
              {!isCollapsed && <span>Reports</span>}
            </Link>
          </>
        )}

        {/* Customer Navigation */}
        {user?.role === "customer" && (
          <>
            <Link
              to="/client/dashboard"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/client/dashboard"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Home size={20} className="shrink-0" />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              to="/tasks"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname.startsWith("/tasks")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <ClipboardList size={20} className="shrink-0" />
              {!isCollapsed && <span>Tasks</span>}
            </Link>
            <Link
              to="/knowledge"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname.startsWith("/knowledge")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare size={20} className="shrink-0" />
              {!isCollapsed && <span>Knowledge</span>}
            </Link>
            <Link
              to="/accounting/payment-data"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                location.pathname === "/accounting/payment-data"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText size={20} className="shrink-0" />
              {!isCollapsed && <span>Payment Data</span>}
            </Link>
          </>
        )}
      </div>

      <div className="p-4">
        <div className="space-y-2">
          <h4 className="font-medium">Dark Mode</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-4">
          Avanti AI - v0.0.1
        </div>
      </div>
    </aside>
  );
}
