
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, UserRole, Customer } from "@/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: User & { customers: Customer[]; is_active: boolean }) => void;
  customers: Customer[];
  defaultValues?: (User & { customers: Customer[], is_active: boolean });
}

const userRoles: { value: UserRole, label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "agent", label: "Agent" },
  { value: "client", label: "Client" }
];

const UserEditDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSave,
  customers,
  defaultValues,
}) => {
  const [email, setEmail] = useState(defaultValues?.email || "");
  const [role, setRole] = useState<UserRole>(defaultValues?.role || "agent");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(
    defaultValues?.customers?.map((c) => c.id) || []
  );
  const [isActive, setIsActive] = useState<boolean>(defaultValues?.is_active ?? true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setEmail(defaultValues?.email || "");
      setRole(defaultValues?.role || "agent");
      setSelectedCustomers(defaultValues?.customers?.map((c) => c.id) || []);
      setIsActive(defaultValues?.is_active ?? true);
    }
  }, [defaultValues, open]);

  // Wenn Rolle auf 'client' gesetzt wird, kann nur ein Kunde ausgewählt werden
  useEffect(() => {
    if (role === "client" && selectedCustomers.length > 1) {
      setSelectedCustomers([selectedCustomers[0]]);
    }
  }, [role, selectedCustomers]);

  const handleCustomerSelect = (custId: string, checked: boolean) => {
    if (role === "client") {
      // Für Client-Rolle: Nur ein Kunde erlaubt (sich selbst)
      setSelectedCustomers(checked ? [custId] : []);
    } else {
      // Für andere Rollen: Mehrfachauswahl möglich
      setSelectedCustomers((current) =>
        checked
          ? [...current, custId]
          : current.filter((id) => id !== custId)
      );
    }
  };

  const handleSave = () => {
    const mappedCustomers = customers.filter((c) => selectedCustomers.includes(c.id));
    const user: User & { customers: Customer[]; is_active: boolean } = {
      id: defaultValues?.id || "",
      email,
      role,
      createdAt: defaultValues?.createdAt || "",
      customers: mappedCustomers,
      is_active: isActive
    };
    onSave(user);
  };

  const handlePasswordReset = async () => {
    if (!defaultValues?.email) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Keine E-Mail-Adresse für diesen Benutzer verfügbar",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(defaultValues.email, {
        redirectTo: window.location.origin + '/auth/reset-password',
      });

      if (error) throw error;

      toast({
        title: "Passwort-Link versendet",
        description: `Ein Link zum Zurücksetzen des Passworts wurde an ${defaultValues.email} gesendet.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive", 
        title: "Fehler beim Zurücksetzen",
        description: error.message || "Das Passwort konnte nicht zurückgesetzt werden.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{defaultValues ? "Nutzer bearbeiten" : "Nutzer anlegen"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4 p-6 pt-2"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
            </label>
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
            <label className="block text-sm font-medium mb-1">
              Rolle
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <span>Status</span>
              <span className={`rounded px-2 py-1 text-xs ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {isActive ? "Aktiv" : "Inaktiv"}
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => setIsActive(v => !v)}
                className="w-5 h-5 accent-avanti-600 rounded"
              />
              <span>Nutzer ist aktiv</span>
            </label>
          </div>
          {role !== "admin" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zugeordnete Kunden {role === "client" && "(nur einer möglich)"}
              </label>
              <div className="flex flex-wrap gap-2">
                {customers.map((cust) => (
                  <label key={cust.id} className="flex items-center text-sm rounded cursor-pointer px-2 py-1 bg-avanti-50 border border-avanti-100">
                    <input
                      type="checkbox"
                      className="mr-2 accent-avanti-600"
                      value={cust.id}
                      checked={selectedCustomers.includes(cust.id)}
                      onChange={(e) => handleCustomerSelect(cust.id, e.target.checked)}
                      disabled={role === "client" && selectedCustomers.length > 0 && !selectedCustomers.includes(cust.id)}
                    />
                    {cust.name}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {role === "client" 
                  ? "Client kann nur einem Kunden (sich selbst) zugeordnet sein" 
                  : "Mehrfachauswahl möglich (Agent)"
                }
              </p>
            </div>
          )}
          {defaultValues && (
            <div className="pt-2 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePasswordReset}
                className="w-full"
              >
                Passwort zurücksetzen
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Sendet einen Link zum Zurücksetzen des Passworts an die E-Mail-Adresse des Benutzers
              </p>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit">
              {defaultValues ? "Speichern" : "Einladen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
