
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface UserSelectProps {
  users: User[];
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
}

export function UserSelect({ users = [], selectedUserId, onUserSelect }: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedUser = users.find(user => user.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white border-gray-200"
        >
          {selectedUser ? `${selectedUser.fullName} (${selectedUser.role})` : "Wähle Kolleg:in..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white">
        <Command>
          <CommandInput placeholder="Suche nach Namen..." className="h-9" />
          <CommandEmpty>Keine Kolleg:innen gefunden.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {Array.isArray(users) && users.length > 0 ? (
              users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.fullName}
                  onSelect={() => {
                    onUserSelect(user.id);
                    setOpen(false);
                  }}
                  className="py-2"
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
                Nutzer werden geladen...
              </div>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
