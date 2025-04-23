
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  BarChart3,
  Users,
  Building2,
  FileText,
  MessageSquare,
  Settings,
  Check,
  Menu,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { useAuth } from '@/contexts/AuthContext';

const SIDEBAR_COLLAPSED_WIDTH = 'w-16';
const SIDEBAR_EXPANDED_WIDTH = 'w-64';

const AppSidebar = () => {
  const { user } = useAuth();
  // Sidebar open/closed (expanded/collapsed) State
  const [collapsed, setCollapsed] = useState(false);
  // Admin section collapse
  const [adminOpen, setAdminOpen] = useState(true);

  if (!user) return null;

  return (
    <aside
      className={`relative group flex flex-col h-screen transition-all duration-300 ease-in-out bg-sidebar border-r border-sidebar-border
        ${collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH}`}
      data-collapsed={collapsed}
    >
      {/* Topbar mit Logo und Toggle-Button */}
      <div className={`flex items-center h-16 px-4 border-b border-sidebar-border justify-between`}>
        <img
          alt="Avanti Logo"
          className="h-8 object-contain"
          src="/lovable-uploads/d7a21b7b-df81-4164-a2a2-cb4a06d4664f.png"
        />
        {/* Sidebar Toggle immer sichtbar */}
        <button
          type="button"
          aria-label={collapsed ? 'Sidebar aufklappen' : 'Sidebar einklappen'}
          className="rounded-lg p-2 hover:bg-sidebar-accent transition-colors"
          onClick={() => setCollapsed((open) => !open)}
        >
          {collapsed ? (
            <Menu className="h-6 w-6 text-sidebar-primary" />
          ) : (
            <ChevronLeft className="h-6 w-6 text-sidebar-primary" />
          )}
        </button>
      </div>

      {/* Inhalt der Sidebar */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                      }`
                    }
                  >
                    <LayoutDashboard className="h-5 w-5 text-sidebar-primary" />
                    {!collapsed && <span className="truncate">Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Aufgaben */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/tasks"
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                      }`
                    }
                  >
                    <ClipboardList className="h-5 w-5 text-sidebar-primary" />
                    {!collapsed && <span className="truncate">Aufgaben</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Abgeschlossen */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/tasks/completed"
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                      }`
                    }
                  >
                    <Check className="h-5 w-5 text-sidebar-primary" />
                    {!collapsed && <span className="truncate">Abgeschlossen</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Wissen */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/knowledge"
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                      }`
                    }
                  >
                    <BookOpen className="h-5 w-5 text-sidebar-primary" />
                    {!collapsed && <span className="truncate">Wissen</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Reports */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/reports"
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                      }`
                    }
                  >
                    <BarChart3 className="h-5 w-5 text-sidebar-primary" />
                    {!collapsed && <span className="truncate">Reports</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Admin Bereich: collapsible */}
        {user.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel
              className={`flex items-center select-none cursor-pointer px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider ${collapsed ? 'justify-center px-0' : ''}`}
              onClick={() => setAdminOpen((open) => !open)}
              tabIndex={0}
              role="button"
              aria-expanded={adminOpen}
            >
              {!collapsed && <span className="flex-1">Admin</span>}
              {/* Chevron Icon immer anzeigen */}
              {adminOpen ? (
                <ChevronDown className="ml-2 h-4 w-4 transition-all duration-200" />
              ) : (
                <ChevronRight className="ml-2 h-4 w-4 transition-all duration-200" />
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out
                  ${adminOpen && !collapsed ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}
                  ${collapsed ? 'hidden' : ''}
                `}
              >
                <SidebarMenu>
                  {/* Users */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin/users"
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                          }`
                        }
                      >
                        <Users className="h-5 w-5 text-sidebar-primary" />
                        {!collapsed && <span className="truncate">Users</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Kunden */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin/customers"
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                          }`
                        }
                      >
                        <Building2 className="h-5 w-5 text-sidebar-primary" />
                        {!collapsed && <span className="truncate">Kunden</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Use Cases */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin/use-cases"
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                          }`
                        }
                      >
                        <FileText className="h-5 w-5 text-sidebar-primary" />
                        {!collapsed && <span className="truncate">Use Cases</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Prompts */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin/prompts"
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                          }`
                        }
                      >
                        <MessageSquare className="h-5 w-5 text-sidebar-primary" />
                        {!collapsed && <span className="truncate">Prompts</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      {/* Footer: Einstellungen */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                  }`
                }
              >
                <Settings className="h-5 w-5 text-sidebar-primary" />
                {!collapsed && <span className="truncate">Einstellungen</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </aside>
  );
};

export default AppSidebar;
