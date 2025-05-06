import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { Home, ListChecks, Book, PhoneIcon } from 'lucide-react';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const { user, signOut } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:w-64">
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>
              Menü
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-1">
            <Button
              variant={pathname === '/' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>

            <Button
              variant={pathname === '/tasks' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/tasks')}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Aufgaben
            </Button>

            <Button
              variant={pathname === '/tasks/completed' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/tasks/completed')}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Erledigte Aufgaben
            </Button>

            <Button
              variant={pathname === '/knowledge' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/knowledge')}
            >
              <Book className="h-4 w-4 mr-2" />
              Wissensdatenbank
            </Button>
            
            <Button
              variant={pathname === '/call-center' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/call-center')}
            >
              <PhoneIcon className="h-4 w-4 mr-2" />
              Call Center
            </Button>
          </div>
          <SheetHeader>
            <SheetDescription>
              Dein Profil
            </SheetDescription>
          </SheetHeader>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="  w-full justify-start">
                <Avatar className="mr-2 h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                {user?.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SheetContent>
      </Sheet>
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-gray-100 border-r">
        <div className="flex-1 flex flex-col space-y-2 p-4">
          <div className="mb-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
            >
              <Avatar className="mr-2 h-8 w-8">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              {user?.email}
            </Button>
          </div>
          <div className="space-y-1">
            <Button
              variant={pathname === '/' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>

            <Button
              variant={pathname === '/tasks' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/tasks')}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Aufgaben
            </Button>

            <Button
              variant={pathname === '/tasks/completed' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/tasks/completed')}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Erledigte Aufgaben
            </Button>

            <Button
              variant={pathname === '/knowledge' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/knowledge')}
            >
              <Book className="h-4 w-4 mr-2" />
              Wissensdatenbank
            </Button>
            
            <Button
              variant={pathname === '/call-center' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/call-center')}
            >
              <PhoneIcon className="h-4 w-4 mr-2" />
              Call Center
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="mt-auto w-full justify-start">
                <Avatar className="mr-2 h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                {user?.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
