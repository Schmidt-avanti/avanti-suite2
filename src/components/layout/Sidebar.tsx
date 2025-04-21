
import React from 'react';
import {
  HomeIcon,
  UsersIcon,
  SettingsIcon,
  Building2Icon,
  FileTextIcon, 
  ListCheckIcon, 
  FolderOpenIcon
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState } from "react";

const Sidebar: React.FC<{ sidebarOpen: boolean }> = ({ sidebarOpen }) => {
  const sidebarClass = sidebarOpen ? 'translate-x-0' : '-translate-x-full';
  const [openAdmin, setOpenAdmin] = useState(true);

  return (
    <aside className={`sidebar fixed top-0 left-0 z-40 h-full w-64 flex-none transition-transform duration-300 ease-in-out bg-white border-r border-gray-200 ${sidebarClass} md:translate-x-0`}>
      <div className="flex flex-col h-full">
        <div className="flex-grow p-4">
          <nav className="space-y-1">
            <div className="space-y-1">
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                    isActive ? 'bg-gray-100 font-medium text-avanti-700' : 'text-gray-700'
                  }`
                }
              >
                <FolderOpenIcon className="h-5 w-5" />
                <span>Admin</span>
              </NavLink>
              
              {/* Submenu für Admin */}
              <div className="ml-7 space-y-1">
                <NavLink
                  to="/admin/use-cases"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors
                    ${isActive ? "bg-primary/10 font-medium text-primary" : "text-gray-600"}`
                  }
                >
                  <ListCheckIcon className="h-4 w-4" />
                  <span>Use Cases</span>
                </NavLink>
                <NavLink
                  to="/admin/prompts"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors
                    ${isActive ? "bg-primary/10 font-medium text-primary" : "text-gray-600"}`
                  }
                >
                  <FileTextIcon className="h-4 w-4" />
                  <span>Prompts</span>
                </NavLink>
              </div>
              
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                    isActive ? 'bg-gray-100 font-medium text-avanti-700' : 'text-gray-700'
                  }`
                }
              >
                <UsersIcon className="h-5 w-5" />
                <span>Benutzer</span>
              </NavLink>
            </div>

            <div className="pt-4">
              <NavLink
                to="/admin/customers"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                    isActive ? 'bg-gray-100 font-medium text-avanti-700' : 'text-gray-700'
                  }`
                }
              >
                <Building2Icon className="h-5 w-5" />
                <span>Kunden</span>
              </NavLink>
            </div>
          </nav>
        </div>
        
        <div className="p-4 mt-auto border-t border-gray-200">
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                isActive ? 'bg-gray-100 font-medium text-avanti-700' : 'text-gray-700'
              }`
            }
          >
            <SettingsIcon className="h-5 w-5" />
            <span>Einstellungen</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
