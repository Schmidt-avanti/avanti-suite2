import React from 'react';
import {
  HomeIcon,
  UsersIcon,
  SettingsIcon,
  Building2Icon,
  FileTextIcon, ListCheckIcon, FolderOpenIcon
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
          <nav>
            <div className="space-y-2">
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 transition ${
                    isActive ? 'bg-gray-100 font-semibold' : ''
                  }`
                }
              >
                <FolderOpenIcon className="h-5 w-5" />
                <span>Admin</span>
              </NavLink>
              {/* Submenu für Admin */}
              <div className="ml-7 mt-1 space-y-1">
                <NavLink
                  to="/admin/use-cases"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-primary/10 transition
                    ${isActive ? "bg-primary/20 font-semibold" : ""}`
                  }
                >
                  <ListCheckIcon className="h-4 w-4" />
                  <span>Use Cases</span>
                </NavLink>
                <NavLink
                  to="/admin/prompts"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-primary/10 transition
                    ${isActive ? "bg-primary/20 font-semibold" : ""}`
                  }
                >
                  <FileTextIcon className="h-4 w-4" />
                  <span>Prompts</span>
                </NavLink>
              </div>
              {/* ... andere NavLinks wenn nötig ... */}
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 transition ${
                    isActive ? 'bg-gray-100 font-semibold' : ''
                  }`
                }
              >
                <UsersIcon className="h-5 w-5" />
                <span>Benutzer</span>
              </NavLink>
            </div>

            <div className="mt-8">
              <ul>
                <li>
                  <NavLink
                    to="/admin/customers"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-2xl hover:bg-primary/10 transition ${
                        isActive ? 'bg-primary/20 font-semibold' : ''
                      }`
                    }
                  >
                    <Building2Icon className="h-5 w-5" />
                    <span>Kunden</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        
        <div className="p-4 mt-auto">
          <hr className="my-4 border-gray-200" />
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 transition ${
                isActive ? 'bg-gray-100 font-semibold' : ''
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
