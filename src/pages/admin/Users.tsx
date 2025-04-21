
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { User, UserRole, Customer } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserListSection from "./users/UserListSection";
import UserEditSection from "./users/UserEditSection";

// TODO: API für Kunden holen, statt Mockdaten (Demo bleibt erstmal).
const mockCustomers: Customer[] = [
  { id: "c1", name: "Acme Corp", createdAt: "" },
  { id: "c2", name: "Globex GmbH", createdAt: "" },
  { id: "c3", name: "Widget AG", createdAt: "" },
];

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState<(User & { customers: Customer[], is_active: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editUser, setEditUser] = useState<(User & { customers: Customer[], is_active: boolean })|null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Edit & Save
  const handleEdit = (user: User & { customers: Customer[], is_active: boolean }) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditUser(null);
    setDialogOpen(true);
  };

  // Speichern (weiterhin im Root - kann später als Hook ausgelagert werden)
  const handleSave = async (user: User & { customers: Customer[]; is_active: boolean }) => {
    try {
      if (user.id) {
        // Benutzer aktualisieren
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: user.role,
            "Full Name": user.firstName || '',
            is_active: user.is_active
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // TODO: Kunden-Zuweisung synchronisieren

        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, ...user } : u))
        );

        toast({
          title: "Benutzer aktualisiert",
          description: "Der Benutzer wurde aktualisiert.",
        });
      } else {
        // Neuen Benutzer anlegen
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(user.email, {
          data: {
            role: user.role,
            "Full Name": "",
            needs_password_reset: true
          }
        });

        if (error) throw error;

        if (data?.user) {
          // Neuen Benutzer zur Liste hinzufügen
          const newUser: User & { customers: Customer[], is_active: boolean } = {
            id: data.user.id,
            email: data.user.email || user.email,
            role: user.role,
            createdAt: new Date().toISOString(),
            customers: user.customers,
            is_active: true
          };

          setUsers(prev => [...prev, newUser]);

          toast({
            title: "Benutzer eingeladen",
            description: `Eine Einladung wurde an ${user.email} gesendet.`,
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Änderung konnte nicht gespeichert werden.",
      });
    } finally {
      setDialogOpen(false);
      setEditUser(null);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Benutzerverwaltung</CardTitle>
          <Button onClick={handleCreate} className="gap-2" size="sm">
            <Plus className="h-4 w-4" /> Neu anlegen
          </Button>
        </CardHeader>
        <CardContent>
          <UserListSection
            customers={mockCustomers}
            onEditUser={handleEdit}
            setUsers={setUsers}
            users={users}
            setIsLoading={setIsLoading}
            isLoading={isLoading}
            onOpenDialog={handleCreate}
          />
        </CardContent>
      </Card>
      <UserEditSection
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        customers={mockCustomers}
        defaultValues={editUser ?? undefined}
      />
    </div>
  );
};

export default UsersAdminPage;
