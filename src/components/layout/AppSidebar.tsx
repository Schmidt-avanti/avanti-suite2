import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '../../hooks/use-is-mobile';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from '@/components/ui/sheet';
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
  SidebarMenuSkeleton 
} from '@/components/ui/sidebar';

import { 
  BookOpen, 
  Briefcase, 
  Building, 
  ChevronDown, 
  ChevronRight, 
  ClipboardCheck, 
  ClipboardList, 
  Code, 
  DollarSign, 
  FileArchive, 
  LayoutDashboard, 
  Menu, 
  MessageSquare, 
  Settings, 
  UserCheck, 
  Users, 
  X 
} from 'lucide-react';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, label, icon, end }) => {
  return (
    <NavLink to={href} end={end}>
      {({ isActive }) => (
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className="w-full justify-start items-center gap-3"
        >
          {icon}
          <span className="truncate">{label}</span>
        </Button>
      )}
    </NavLink>
  );
};

export const AppSidebar = () => {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [openGroups, setOpenGroups] = useState<string[]>(['aufgaben', 'admin', 'supervisor', 'accounting']);

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const renderSidebarContent = () => {
    const dashboardPath = user?.role === 'agent' ? '/agent/dashboard' : '/dashboard';
    return (
      <>
        {/* Company Logo */}
        <div className="flex items-center justify-start px-3 py-6 mb-4">
          <img 
            src="/lovable-uploads/eff651fc-49c9-4b51-b5bc-d14c401b3934.png" 
            alt="Avanti Suite" 
            className="h-8 w-auto filter brightness-0 invert transition-transform duration-200 hover:scale-105"
          />
        </div>
        
        {/* Main Navigation */}
        {/* Customer Dashboard as first item for customers */}
        {user?.role === 'customer' && (
          <NavItem
            href="/admin/customer-dashboard"
            label="Kunden Dashboard"
            icon={<UserCheck size={18} />}
          />
        )}
        
        {/* Dashboard - Only visible to admin and agent roles */}
        {(user?.role === 'admin' || user?.role === 'agent') && (
          <NavItem
            href={dashboardPath}
            label="Dashboard"
            icon={<LayoutDashboard size={18} />}
          />
        )}
        
        <NavItem
          href="/knowledge"
          label="Wissen"
          icon={<BookOpen size={18} />}
        />
        <NavItem
          href="/admin/use-cases"
          label="Use Cases"
          icon={<Briefcase size={18} />}
        />
        <NavItem
          href="/tasks"
          label="Aufgaben"
          icon={<ClipboardList size={18} />}
          end
        />
        <NavItem
          href="/tasks/completed"
          label="Abgeschlossen"
          icon={<ClipboardCheck size={18} />}
        />

        {/* Customer Dashboard Link - Visible only to admin (not customers, as they have it at the top) */}
        {user?.role === 'admin' && (
          <NavItem
            href="/admin/customer-dashboard"
            label="Kunden Dashboard"
            icon={<UserCheck size={18} />}
          />
        )}

        {/* Role-based Navigation */}
        {(user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'accounting') && (
          <div className="mt-4 pt-4 border-t border-border/20">
            {/* Supervisor Section */}
            {(user.role === 'admin' || user.role === 'supervisor') && (
              <Collapsible open={openGroups.includes('supervisor')} onOpenChange={() => toggleGroup('supervisor')}>
                <CollapsibleTrigger className='w-full'>
                  <div className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                    Supervisor
                    {openGroups.includes('supervisor') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-1">
                    <NavItem href="/supervisor/tasks-review" label="Task Review" icon={<ClipboardCheck size={18} />} />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Accounting Section */}
            {(user.role === 'admin' || user.role === 'accounting') && (
              <Collapsible open={openGroups.includes('accounting')} onOpenChange={() => toggleGroup('accounting')}>
                <CollapsibleTrigger className='w-full'>
                  <div className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                    Accounting
                    {openGroups.includes('accounting') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-1 space-y-1">
                  <NavItem href="/accounting/invoices" label="Rechnungen" icon={<FileArchive size={18} />} />
                  <NavItem href="/accounting/payment-data" label="Zahlungsdaten" icon={<DollarSign size={18} />} />
                  <NavItem href="/accounting/products" label="Produkte" icon={<Briefcase size={18} />} />
                  <NavItem href="/accounting/product-options" label="Optionen" icon={<Settings size={18} />} />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Administration Section */}
            {user.role === 'admin' && (
               <Collapsible open={openGroups.includes('admin')} onOpenChange={() => toggleGroup('admin')}>
                <CollapsibleTrigger className='w-full'>
                  <div className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                    Administration
                    {openGroups.includes('admin') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-1 space-y-1">
                  <NavItem href="/admin/users" label="Benutzer" icon={<Users size={18} />} />
                  <NavItem href="/admin/customers" label="Kunden" icon={<Building size={18} />} />
                  <NavItem href="/admin/use-cases" label="Use Cases" icon={<Briefcase size={18} />} />
                  <NavItem href="/admin/intelligent-dialog-test" label="Neue Use Cases" icon={<Code size={18} />} />
                  <NavItem href="/admin/prompts" label="Prompts" icon={<MessageSquare size={18} />} />
                  <NavItem href="/admin/whatsapp-accounts" label="WhatsApp Konten" icon={<MessageSquare size={18} />} />
                  <NavItem href="/admin/endkunden" label="Endkunden" icon={<Users size={18} />} />
                  <NavItem href="/admin/endkunden-kontakte" label="Endkundenkontakte" icon={<Users size={18} />} />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </>
    );
  };

  if (isLoading || !user) {
    return (
      <Sidebar className={isMobile ? 'hidden' : ''}>
        <SidebarContent>
          <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-background/50 backdrop-blur-sm">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar>
            <SidebarContent className='p-4'>
              {renderSidebarContent()}
            </SidebarContent>
          </Sidebar>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sidebar>
      <SidebarContent className='p-2'>
        {renderSidebarContent()}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
