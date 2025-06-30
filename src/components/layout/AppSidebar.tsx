import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  BarChart3,
  FileText,
  MessageSquare,
  Timer,
  Radio,
  Clock,
  Check,
  ChevronDown,
  ChevronRight,
  Receipt,
  CreditCard,
  Phone,
  Users,
  Building,
  Terminal,
  Contact,
  Puzzle,
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
import { useIsMobile } from '@/hooks/use-mobile';

const AppSidebar = () => {
  const { user } = useAuth();
  const [supervisorOpen, setSupervisorOpen] = useState(true);
  const [accountingOpen, setAccountingOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { setOpen } = useSidebar();

  // Close sidebar on mobile after navigation
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, isMobile, setOpen]);

  if (!user) return null;

  const showCallCenter = user.role === 'admin' || user.role === 'agent';

  return (
    <Sidebar>
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center px-4 pt-4 pb-4 border-b border-sidebar-border">
          <img
            alt="Avanti Logo"
            className="h-8 object-contain"
            src="/lovable-uploads/d7a21b7b-df81-4164-a2a2-cb4a06d4664f.png"
          />
        </div>
        <SidebarContent className="mt-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                        }`
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
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                        }`
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
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                        }`
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
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                        }`
                      }
                    >
                      <BookOpen className="h-5 w-5 text-sidebar-primary" />
                      <span className="truncate">Wissen</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {user.role === 'customer' && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/admin/use-cases"
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                              isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                            }`
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
                          to="/reports"
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                              isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                            }`
                          }
                        >
                          <BarChart3 className="h-5 w-5 text-sidebar-primary" />
                          <span className="truncate">Reports</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/whatsapp"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                        }`
                      }
                    >
                      <MessageSquare className="h-5 w-5 text-sidebar-primary" />
                      <span className="truncate">WhatsApp</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {showCallCenter && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/call-center"
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                          }`
                        }
                      >
                        <Phone className="h-5 w-5 text-sidebar-primary" />
                        <span className="truncate">Call Center</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {user.role === 'admin' && (
            <>
              <SidebarGroup>
                <SidebarGroupLabel
                  className="flex items-center select-none cursor-pointer px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider"
                  onClick={() => setSupervisorOpen((open) => !open)}
                  tabIndex={0}
                  role="button"
                  aria-expanded={supervisorOpen}
                >
                  <span className="flex-1">Supervisor</span>
                  {supervisorOpen ? (
                    <ChevronDown className="ml-2 h-4 w-4 transition-all duration-200" />
                  ) : (
                    <ChevronRight className="ml-2 h-4 w-4 transition-all duration-200" />
                  )}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      supervisorOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/supervisor/live-agents"
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                              }`
                            }
                          >
                            <Radio className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Active Agents</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/reports"
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                              }`
                            }
                          >
                            <BarChart3 className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Reports</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/supervisor/short-breaks"
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                              }`
                            }
                          >
                            <Timer className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Short-Break Tool</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/supervisor/processing-time"
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                              }`
                            }
                          >
                            <Clock className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Live Monitoring</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel
                  className="flex items-center select-none cursor-pointer px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider"
                  onClick={() => setAccountingOpen((open) => !open)}
                  tabIndex={0}
                  role="button"
                  aria-expanded={accountingOpen}
                >
                  <span className="flex-1">Accounting</span>
                  {accountingOpen ? (
                    <ChevronDown className="ml-2 h-4 w-4 transition-all duration-200" />
                  ) : (
                    <ChevronRight className="ml-2 h-4 w-4 transition-all duration-200" />
                  )}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      accountingOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/accounting/products"
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                              }`
                            }
                          >
                            <ClipboardList className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Produkte</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/accounting/product-options" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${ isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' }`}>
                            <Puzzle className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Optionen</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/accounting/opening-hours"
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                              }`
                            }
                          >
                            <Clock className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Öffnungszeiten</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/accounting/invoices"
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                              }`
                            }
                          >
                            <Receipt className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Rechnung</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/accounting/payment-data"
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                              }`
                            }
                          >
                            <CreditCard className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Zahlungsdaten</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                    </SidebarMenu>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>

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
                    }`}>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/users" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${ isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' }`}>
                            <Users className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Benutzer</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/customers" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${ isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' }`}>
                            <Building className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Firmenkunden</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/use-cases" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${ isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' }`}>
                            <FileText className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Use Cases</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/twilio-phone-numbers" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${ isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' }`}>
                            <Phone className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Telefonnummern</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/prompt-templates" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${ isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' }`}>
                            <Terminal className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Prompt Templates</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/endkunden" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${ isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' }`}>
                            <Users className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Endkunden</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/ansprechpartner" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${ isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' }`}>
                            <Contact className="h-5 w-5 text-sidebar-primary" />
                            <span className="truncate">Ansprechpartner</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
        <SidebarFooter>
          {/* Footer content can go here */}
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};

export default AppSidebar;