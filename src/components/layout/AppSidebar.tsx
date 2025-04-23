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
  ChevronDown,
  ChevronRight
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
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

const AppSidebar = () => {
  const { user } = useAuth();
  const [adminOpen, setAdminOpen] = useState(true);

  if (!user) return null;

  return (
    <Sidebar collapsible="none">
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center px-4 pt-4 pb-8">
          <img
            alt="Avanti Logo"
            className="h-8 object-contain"
            src="/lovable-uploads/d7a21b7b-df81-4164-a2a2-cb4a06d4664f.png"
          />
        </div>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                      }
                    >
                      <LayoutDashboard className="h-5 w-5 text-sidebar-primary" />
                      <span className="truncate">Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/tasks"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                      }
                    >
                      <ClipboardList className="h-5 w-5 text-sidebar-primary" />
                      <span className="truncate">Aufgaben</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/tasks/completed"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                      }
                    >
                      <Check className="h-5 w-5 text-sidebar-primary" />
                      <span className="truncate">Abgeschlossen</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/knowledge"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                      }
                    >
                      <BookOpen className="h-5 w-5 text-sidebar-primary" />
                      <span className="truncate">Wissen</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/reports"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                      }
                    >
                      <BarChart3 className="h-5 w-5 text-sidebar-primary" />
                      <span className="truncate">Reports</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {user.role === 'admin' && (
            <SidebarGroup>
              <SidebarGroupLabel
                className="flex items-center select-none cursor-pointer px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider"
                onClick={() => setAdminOpen((open) => !open)}
                tabIndex={0}
                role="button"
                aria-expanded={adminOpen}
              >
                <span className="flex-1">Admin</span>
                {adminOpen ? (
                  <ChevronDown className="ml-2 h-4 w-4 transition-all duration-200" />
                ) : (
                  <ChevronRight className="ml-2 h-4 w-4 transition-all duration-200" />
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    adminOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/admin/users"
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                          }
                        >
                          <Users className="h-5 w-5 text-sidebar-primary" />
                          <span className="truncate">Users</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/admin/customers"
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                          }
                        >
                          <Building2 className="h-5 w-5 text-sidebar-primary" />
                          <span className="truncate">Kunden</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/admin/use-cases"
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                          }
                        >
                          <FileText className="h-5 w-5 text-sidebar-primary" />
                          <span className="truncate">Use Cases</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/admin/prompts"
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                          }
                        >
                          <MessageSquare className="h-5 w-5 text-sidebar-primary" />
                          <span className="truncate">Prompts</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`
                  }
                >
                  <Settings className="h-5 w-5 text-sidebar-primary" />
                  <span className="truncate">Einstellungen</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};

export default AppSidebar;
