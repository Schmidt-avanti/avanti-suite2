import React from 'react';
import { LayoutDashboard, ClipboardList, BookOpen, BarChart3, Users, Building2, FileText, MessageSquare, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
const AppSidebar = () => {
  const {
    user
  } = useAuth();
  if (!user) return null;
  return <Sidebar>
      <SidebarContent>
        <div className="px-4 py-6 border-b border-sidebar-border">
          <img alt="Avanti Logo" className="h-8 object-contain" src="/lovable-uploads/d7a21b7b-df81-4164-a2a2-cb4a06d4664f.png" />
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                    <LayoutDashboard className="mr-3 h-5 w-5 text-sidebar-primary" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <NavLink to="/tasks" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                    <ClipboardList className="mr-3 h-5 w-5 text-sidebar-primary" />
                    <span>Aufgaben</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem className="ml-6">
                <SidebarMenuButton>
                  <NavLink to="/tasks/completed" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                    <span>Abgeschlossen</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/knowledge" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                    <BookOpen className="mr-3 h-5 w-5 text-sidebar-primary" />
                    <span>Wissen</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/reports" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                    <BarChart3 className="mr-3 h-5 w-5 text-sidebar-primary" />
                    <span>Reports</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === 'admin' && <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/users" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                      <Users className="mr-2 h-4 w-4 text-sidebar-primary" />
                      <span>Users</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/customers" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                      <Building2 className="mr-2 h-4 w-4 text-sidebar-primary" />
                      <span>Kunden</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/use-cases" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                      <FileText className="mr-2 h-4 w-4 text-sidebar-primary" />
                      <span>Use Cases</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/prompts" className={({
                  isActive
                }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                      <MessageSquare className="mr-2 h-4 w-4 text-sidebar-primary" />
                      <span>Prompts</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className={({
              isActive
            }) => `flex items-center rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>
                <Settings className="mr-3 h-5 w-5 text-sidebar-primary" />
                <span>Einstellungen</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>;
};
export default AppSidebar;