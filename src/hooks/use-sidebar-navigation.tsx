
import { Building2, LayoutDashboard, MessageSquare, BarChart3, Users, Settings } from 'lucide-react';

export type NavigationItem = {
  to: string;
  icon: any;
  label: string;
  requiresAdmin?: boolean;
};

export const useSidebarNavigation = () => {
  const navigationItems: NavigationItem[] = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard'
    },
    {
      to: '/tasks',
      icon: MessageSquare,
      label: 'Aufgaben'
    },
    {
      to: '/clients',
      icon: Building2,
      label: 'Kunden'
    },
    {
      to: '/analytics',
      icon: BarChart3,
      label: 'Analytics'
    }
  ];

  const adminItems: NavigationItem[] = [
    {
      to: '/admin/users',
      icon: Users,
      label: 'Users',
      requiresAdmin: true
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Settings',
      requiresAdmin: true
    }
  ];

  return {
    navigationItems,
    adminItems
  };
};
