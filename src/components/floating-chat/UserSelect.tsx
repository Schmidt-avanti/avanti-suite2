
import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface UserSelectProps {
  users: User[] | undefined;
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
  isLoading?: boolean;
}

export function UserSelect({ users = [], selectedUserId, onUserSelect, isLoading = false }: UserSelectProps) {
  const [open, setOpen] = useState(false);
  
  // Sicherstellen, dass users ein Array ist, auch wenn undefined kommt
  const safeUsers = Array.isArray(users) ? users : [];
  
  // Finden des ausgewählten Benutzers in der sicheren Liste
  const selectedUser = safeUsers.find(user => user.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white border-gray-200 text-left font-normal h-12 rounded-xl"
          disabled={isLoading}
        >
          {selectedUser ? `${selectedUser.fullName} (${selectedUser.role})` : "Wähle Kolleg:in..."}
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-70" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white shadow-lg rounded-xl">
        <Command className="rounded-xl">
          <CommandInput placeholder="Suche nach Namen..." className="h-9 rounded-xl" />
          <CommandEmpty>Keine Kolleg:innen gefunden.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="py-6 flex justify-center items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Lade Kolleg:innen...
              </div>
            ) : safeUsers.length > 0 ? (
              safeUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.fullName}
                  onSelect={() => {
                    onUserSelect(user.id);
                    setOpen(false);
                  }}
                  className="py-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserId === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{user.fullName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({user.role})
                  </span>
                </CommandItem>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Keine aktiven Kolleg:innen verfügbar
              </div>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
