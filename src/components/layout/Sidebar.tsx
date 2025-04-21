
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Settings,
  Building,
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Define navigation items based on user role
  const getNavItems = () => {
    const adminItems = [
      {
        name: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'Users',
        href: '/admin/users',
        icon: Users,
      },
      {
        name: 'Customers',
        href: '/admin/customers',
        icon: Building,
      },
      {
        name: 'Tasks',
        href: '/admin/tasks',
        icon: CheckSquare,
      },
      {
        name: 'Settings',
        href: '/admin/settings',
        icon: Settings,
      },
    ];

    const agentItems = [
      {
        name: 'Dashboard',
        href: '/agent/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'My Customers',
        href: '/agent/customers',
        icon: Building,
      },
      {
        name: 'Tasks',
        href: '/agent/tasks',
        icon: CheckSquare,
      },
      {
        name: 'Settings',
        href: '/agent/settings',
        icon: Settings,
      },
    ];

    const customerItems = [
      {
        name: 'Dashboard',
        href: '/customer/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'My Tasks',
        href: '/customer/tasks',
        icon: ClipboardList,
      },
      {
        name: 'Settings',
        href: '/customer/settings',
        icon: Settings,
      },
    ];

    switch (user.role) {
      case 'admin':
        return adminItems;
      case 'agent':
        return agentItems;
      case 'customer':
        return customerItems;
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 flex h-full w-64 flex-col border-r bg-background transition-transform md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <div className="flex-1 space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                location.pathname === item.href
                  ? "bg-avanti-50 text-avanti-600"
                  : "text-gray-600 hover:bg-avanti-50 hover:text-avanti-600"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  location.pathname === item.href
                    ? "text-avanti-600"
                    : "text-gray-500 group-hover:text-avanti-500"
                )}
              />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div>
            <p className="text-sm font-medium text-gray-700">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
