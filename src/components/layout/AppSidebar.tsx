
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { SidebarNavGroup } from './sidebar/SidebarNavGroup';
import { useSidebarNavigation } from '@/hooks/use-sidebar-navigation';

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const { navigationItems, adminItems } = useSidebarNavigation();
  
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
        
        <SidebarNavGroup items={navigationItems} />
        
        {user.role === 'admin' && (
          <SidebarNavGroup items={adminItems} />
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
