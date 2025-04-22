import React from 'react';
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
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

const AppSidebar = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <Sidebar>
      <SidebarContent>
        <div className="px-4 py-6 border-b border-gray-100">
          <img 
            src="/lovable-uploads/724ec514-2826-4aa4-873d-1a8e00465f8f.png" 
            alt="Avanti Logo" 
            className="h-8 object-contain" 
          />
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/dashboard" 
                    className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                  >
                    <LayoutDashboard className="mr-3 h-5 w-5" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <NavLink 
                    to="/tasks" 
                    className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                  >
                    <ClipboardList className="mr-3 h-5 w-5" />
                    <span>Aufgaben</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem className="ml-6">
                <SidebarMenuButton>
                  <NavLink 
                    to="/tasks/completed" 
                    className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                  >
                    <span>Abgeschlossen</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/knowledge"
                    className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                  >
                    <BookOpen className="mr-3 h-5 w-5" />
                    <span>Wissen</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/reports" 
                    className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                  >
                    <BarChart3 className="mr-3 h-5 w-5" />
                    <span>Reports</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/admin/users" 
                      className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Users</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/admin/customers" 
                      className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>Kunden</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/admin/use-cases" 
                      className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Use Cases</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/admin/prompts" 
                      className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Prompts</span>
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
            <SidebarMenuButton asChild>
              <NavLink 
                to="/settings" 
                className={({ isActive }) => `flex items-center rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-avanti-50 text-avanti-900' : ''}`}
              >
                <Settings className="mr-3 h-5 w-5" />
                <span>Einstellungen</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
