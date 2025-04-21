
import React from 'react';
import {
  HomeIcon,
  UsersIcon,
  SettingsIcon,
  Building2Icon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC<{ sidebarOpen: boolean }> = ({ sidebarOpen }) => {
  const sidebarClass = sidebarOpen ? 'translate-x-0' : '-translate-x-full';

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
                <HomeIcon className="h-5 w-5" />
                <span>Dashboard</span>
              </NavLink>
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
