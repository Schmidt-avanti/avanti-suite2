
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Menu, X } from 'lucide-react';
import { ShortBreakButton } from '@/components/short-break/ShortBreakButton';
import { NotificationButton } from '@/components/notifications/NotificationButton';
import { ScreenShareButton } from '@/components/screen-share/ScreenShareButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar } from '@/components/ui/sidebar';
import { useState } from 'react';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { toggleSidebar, open } = useSidebar();
  const [isSearchActive, setIsSearchActive] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };
  
  const toggleSearch = () => {
    if (isMobile) {
      setIsSearchActive(!isSearchActive);
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-white border-b border-gray-100 h-16">
      <div className="h-full flex items-center justify-between px-8 sm:px-4">
        {/* Mobile menu button and search area */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden mr-2" 
              onClick={toggleSidebar}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Toggle Menu</span>
            </Button>
          )}
          
          {isMobile && isSearchActive ? (
            <div className="absolute inset-x-0 top-0 bg-white h-16 px-4 flex items-center z-30">
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-2" 
                onClick={toggleSearch}
              >
                <X className="h-5 w-5" />
              </Button>
              <input 
                type="search"
                placeholder="Suche..."
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-avanti-500 focus:ring-1 focus:ring-avanti-500"
                autoFocus
              />
              <Search className="absolute left-14 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          ) : (
            <>
              {isMobile ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleSearch}
                >
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
                </Button>
              ) : (
                <div className="relative w-full max-w-lg">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="search"
                    placeholder="Suche..."
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-avanti-500 focus:ring-1 focus:ring-avanti-500"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Add ShortBreakButton for all users */}
        <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-4'} shrink-0`}>
          {user && !isSearchActive && (
            <>
              <ShortBreakButton />
              <NotificationButton />
              <ScreenShareButton />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`relative ${isMobile ? 'h-8 w-8 ml-1' : 'h-9 w-9'} bg-gray-100 rounded-full flex items-center justify-center`}>
                    <Avatar className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'}`}>
                      {/* Conditionally render AvatarImage only if avatarUrl exists */}
                      {user.avatarUrl && (
                        <AvatarImage 
                          src={user.avatarUrl} 
                          alt={user.firstName || user.email} 
                        />
                      )}
                      <AvatarFallback className="bg-avanti-100 text-avanti-800 text-sm">
                        {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.firstName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
