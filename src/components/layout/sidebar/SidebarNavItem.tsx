
import { NavLink } from 'react-router-dom';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import type { NavigationItem } from '@/hooks/use-sidebar-navigation';

interface SidebarNavItemProps {
  item: NavigationItem;
}

export const SidebarNavItem = ({ item }: SidebarNavItemProps) => {
  const Icon = item.icon;
  
  return (
    <SidebarMenuItem key={item.label}>
      <SidebarMenuButton asChild>
        <NavLink 
          to={item.to}
          className={({ isActive }) => 
            `flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
              isActive ? 'bg-white/10' : ''
            }`
          }
        >
          <Icon className="mr-3 h-4 w-4" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
