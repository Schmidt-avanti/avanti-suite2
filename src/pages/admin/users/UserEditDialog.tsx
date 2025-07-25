
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, UserRole, Customer } from "@/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { useFetchCustomers } from "./useFetchCustomers";
import { ChevronDown, ChevronUp, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: User & { customers: Customer[]; is_active: boolean; name: string }) => void;
  customers?: Customer[]; // Deprecated, use fetched customers instead
  defaultValues?: (User & { customers: Customer[], is_active: boolean });
}

const userRoles: { value: UserRole, label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "agent", label: "Agent" },
  { value: "customer", label: "Client" }
];

const UserEditDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSave,
  defaultValues,
}) => {
  const { customers, loading, error } = useFetchCustomers();
  const [name, setName] = useState(defaultValues?.firstName || "");
  const [email, setEmail] = useState(defaultValues?.email || "");
  const [role, setRole] = useState<UserRole>(defaultValues?.role || "agent");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(
    defaultValues?.customers?.map((c) => c.id) || []
  );
  const [isActive, setIsActive] = useState<boolean>(defaultValues?.is_active ?? true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(defaultValues?.firstName || "");
      setEmail(defaultValues?.email || "");
      setRole(defaultValues?.role || "agent");
      setSelectedCustomers(defaultValues?.customers?.map((c) => c.id) || []);
      setIsActive(defaultValues?.is_active ?? true);
      setDropdownOpen(false);
    }
  }, [defaultValues, open]);

  // Nur ein Kunde für Customer möglich
  useEffect(() => {
    if (role === "customer" && selectedCustomers.length > 1) {
      setSelectedCustomers([selectedCustomers[0]]);
    }
  }, [role, selectedCustomers]);

  const handleCustomerSelect = (customerId: string) => {
    if (role === "customer") {
      setSelectedCustomers((current) =>
        current[0] === customerId ? [] : [customerId]
      );
    } else {
      setSelectedCustomers((current) =>
        current.includes(customerId)
          ? current.filter((id) => id !== customerId)
          : [...current, customerId]
      );
    }
  };

  const handleSave = () => {
    // Validate email
    if (!email || !email.includes('@')) {
      toast({
        variant: "destructive",
        title: "Ungültige E-Mail",
        description: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      });
      return;
    }

    const mappedCustomers = customers.filter((c) => selectedCustomers.includes(c.id));
    const user: User & { customers: Customer[]; is_active: boolean; name: string } = {
      id: defaultValues?.id || "",
      email,
      role,
      createdAt: defaultValues?.createdAt || "",
      customers: mappedCustomers,
      is_active: isActive,
      name: name
    };
    onSave(user);
  };

  // Schließen des Dropdowns bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById("customers-dropdown");
      const trigger = document.getElementById("customers-multiselect-trigger");
      
      if (
        dropdown && 
        !dropdown.contains(event.target as Node) && 
        trigger && 
        !trigger.contains(event.target as Node) &&
        dropdownOpen
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // --- Searchable, virtualized multi-select UI ---
  function MultiSelectCustomers() {
    const [search, setSearch] = useState("");
    const filteredCustomers = customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
      <div className="py-2 text-sm text-muted-foreground">Lädt Kunden ...</div>
    );
    if (error) return (
      <div className="py-2 text-sm text-destructive">{error}</div>
    );
    if (!customers.length) {
      return <div className="py-2 text-sm text-muted-foreground">Keine Firmen gefunden</div>;
    }
    return (
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Kunden suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-2 px-3 py-2 border rounded focus:border-avanti-500 outline-none"
        />
        <div className="border rounded-xl bg-white shadow max-h-64 overflow-auto" style={{ minHeight: 120 }}>
          {filteredCustomers.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Keine Treffer</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {filteredCustomers.map((cust) => {
                const checked = selectedCustomers.includes(cust.id);
                const disabled = (role === "customer"
                  && selectedCustomers.length > 0
                  && !selectedCustomers.includes(cust.id)
                );
                return (
                  <button
                    key={cust.id}
                    type="button"
                    className={cn(
                      "flex w-full text-left items-center gap-2 px-4 py-2 text-base rounded hover:bg-avanti-50 transition",
                      checked ? "bg-avanti-100 font-bold" : "",
                      disabled && "opacity-60 pointer-events-none"
                    )}
                    onClick={() => handleCustomerSelect(cust.id)}
                    disabled={disabled}
                    style={{ justifyContent: "flex-start" }}
                  >
                    <span className={cn(
                      "inline-flex items-center justify-center w-4 h-4 rounded border border-avanti-400 mr-2",
                      checked ? "bg-avanti-600 text-white border-avanti-600" : "bg-white"
                    )}>
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <span className="text-left">{cust.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {selectedCustomers.length} ausgewählt
          </span>
          {selectedCustomers.length > 0 && (
            <button
              type="button"
              className="text-xs text-blue-500 underline ml-2"
              onClick={() => setSelectedCustomers([])}
            >
              Auswahl löschen
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {role === "customer"
            ? "Client kann nur einem Kunden zugeordnet sein"
            : "Mehrfachauswahl ist möglich"}
        </p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }} >
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{defaultValues ? "Nutzer bearbeiten" : "NEUEN BENUTZER ANLEGEN"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4 p-6 pt-2"
        >
          <div>
            <label className="block text-base font-medium mb-1">Name:</label>
            <input
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-avanti-500"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-base font-medium mb-1">E-Mail:</label>
            <input
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-avanti-500"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!defaultValues}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-base font-medium mb-1">Rolle:</label>
            <RadioGroup
              value={role}
              onValueChange={(val) => setRole(val as UserRole)}
              className="flex gap-4"
            >
              {userRoles.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <label htmlFor={r.value} className="cursor-pointer">
                    {r.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <label className="block text-base font-medium mb-1">
              Kunden: (Mehrfachauswahl, je nach Rolle)
            </label>
            <MultiSelectCustomers />
          </div>
          <div>
            <label className="flex items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => setIsActive(v => !v)}
                className="w-5 h-5 accent-avanti-600 rounded"
              />
              Benutzer ist aktiv
            </label>
          </div>
          {!defaultValues && (
            <div className="bg-gray-50 border rounded-xl p-3 text-sm mt-4">
              <div>
                Das erste Passwort lautet:<br />
                <span className="font-mono font-semibold text-avanti-600 break-all">W1llkommen@avanti</span>
              </div>
              <div className="mt-2">
                Der neue Benutzer muss beim ersten Einloggen ein neues Passwort auswählen!
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit">
              {defaultValues ? "Speichern" : "Anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
