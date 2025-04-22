
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Building2
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  
  if (!user) return null;

  return (
    <Sidebar variant="inset" className="bg-sidebar text-sidebar-foreground">
      <SidebarContent>
        <div className="px-6 py-5 border-b border-white/10">
          <img 
            src="/lovable-uploads/724ec514-2826-4aa4-873d-1a8e00465f8f.png" 
            alt="Avanti Logo" 
            className="h-8 object-contain brightness-0 invert" 
          />
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/dashboard" 
                    className={({ isActive }) => 
                      `flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                        isActive ? 'bg-white/10' : ''
                      }`
                    }
                  >
                    <LayoutDashboard className="mr-3 h-4 w-4" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/tasks" 
                    className={({ isActive }) => 
                      `flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                        isActive ? 'bg-white/10' : ''
                      }`
                    }
                  >
                    <MessageSquare className="mr-3 h-4 w-4" />
                    <span>Aufgaben</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/clients" 
                    className={({ isActive }) => 
                      `flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                        isActive ? 'bg-white/10' : ''
                      }`
                    }
                  >
                    <Building2 className="mr-3 h-4 w-4" />
                    <span>Kunden</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/analytics" 
                    className={({ isActive }) => 
                      `flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                        isActive ? 'bg-white/10' : ''
                      }`
                    }
                  >
                    <BarChart3 className="mr-3 h-4 w-4" />
                    <span>Analytics</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/admin/users" 
                      className={({ isActive }) => 
                        `flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                          isActive ? 'bg-white/10' : ''
                        }`
                      }
                    >
                      <Users className="mr-3 h-4 w-4" />
                      <span>Users</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/settings" 
                      className={({ isActive }) => 
                        `flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                          isActive ? 'bg-white/10' : ''
                        }`
                      }
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      <span>Settings</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10"
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Abmelden</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
