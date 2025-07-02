import {
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Settings,
  Users,
  Calendar,
  Phone,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  role?: "admin" | "agent" | "customer";
}

const Sidebar = () => {
  const { user } = useAuth();
  const [assignedCustomer, setAssignedCustomer] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignedCustomer = async () => {
      if (user?.role === "agent") {
        const { data, error } = await supabase
          .from("user_customer_assignments")
          .select("customer_id")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching assigned customer:", error);
        } else if (data) {
          setAssignedCustomer(data.customer_id);
        }
      }
    };

    fetchAssignedCustomer();
  }, [user]);

  const navItems: NavItem[] = [
    {
      to: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
    },
    {
      to: "/tasks",
      icon: <ListChecks className="h-5 w-5" />,
      label: "Aufgaben",
    },
    {
      to: "/meine-aufgaben",
      icon: <ListChecks className="h-5 w-5" />,
      label: "Meine Aufgaben",
      role: "customer",
    },
    {
      to: "/termine",
      icon: <Calendar className="h-5 w-5" />,
      label: "Termine",
      role: "customer",
    },
    {
      to: "/call-center",
      icon: <Phone className="h-5 w-5" />,
      label: "Call Center",
      role: "agent",
    },
    {
      to: "/admin/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Admin Dashboard",
      role: "admin",
    },

    {
      to: "/admin/endkunden",
      icon: <Users className="h-5 w-5" />,
      label: "Endkunden",
      role: "admin",
    },
    {
      to: "/admin/endkunden-kontakte",
      icon: <Users className="h-5 w-5" />,
      label: "Endkundenkontakte",
      role: "admin",
    },
    {
      to: "/admin/customers",
      icon: <Users className="h-5 w-5" />,
      label: "Kunden",
      role: "admin",
    },
    {
      to: "/customer/customer-dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Kunden Dashboard",
      role: "admin",
    },
    {
      to: "/admin/whatsapp-accounts",
      icon: <MessageSquare className="h-5 w-5" />,
      label: "WhatsApp Konten",
      role: "admin",
    },
    {
      to: "/admin/phone-numbers",
      icon: <Phone className="h-5 w-5" />,
      label: "Phone Numbers",
      role: "admin"
    },
    {
      to: "/admin/settings",
      icon: <Settings className="h-5 w-5" />,
      label: "Einstellungen",
      role: "admin",
    },

  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r py-4">
      <div className="px-4 mb-6">
        <img
          alt="avanti suite"
          className="h-10"
          src="/lovable-uploads/eff651fc-49c9-4b51-b5bc-d14c401b3934.png"
        />
      </div>
      <div className="flex-grow flex flex-col justify-between">
        <nav className="space-y-1">
          {navItems.map((item) => {
            if (item.role && user?.role !== item.role) {
              return null;
            }
            if (item.role === "customer" && assignedCustomer) {
              return null;
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-200 ${
                    isActive
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700"
                  }`
                }
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        {user && (
          <div className="p-4">
            <p className="text-sm text-gray-500">
              Eingeloggt als {user.email} ({user.role})
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
