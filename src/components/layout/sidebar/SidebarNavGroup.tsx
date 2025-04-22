
import { 
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu
} from '@/components/ui/sidebar';
import { SidebarNavItem } from './SidebarNavItem';
import type { NavigationItem } from '@/hooks/use-sidebar-navigation';

interface SidebarNavGroupProps {
  items: NavigationItem[];
}

export const SidebarNavGroup = ({ items }: SidebarNavGroupProps) => {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarNavItem key={item.to} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
