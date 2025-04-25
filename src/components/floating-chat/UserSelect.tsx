
import { useState } from "react";
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

export function UserSelect({ users, selectedUserId, onUserSelect }: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedUser = users.find(user => user.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedUser ? `${selectedUser.fullName} (${selectedUser.role})` : "Wähle Kolleg:in..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Suche nach Namen..." />
          <CommandEmpty>Keine Kolleg:innen gefunden.</CommandEmpty>
          <CommandGroup>
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={user.fullName}
                onSelect={() => {
                  onUserSelect(user.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedUserId === user.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {user.fullName}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({user.role})
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
