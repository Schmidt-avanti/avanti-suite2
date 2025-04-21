
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { User, UserRole, Customer } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserListTable from "./users/UserListTable";
import UserEditDialog from "./users/UserEditDialog";

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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Updated: Nutzer inkl. Status, Rolle, Kunden laden
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Lade Profile
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, "Full Name", created_at, is_active');

      if (profilesError) throw profilesError;

      // Lade Kunden-Zuordnung (user_customer_assignments) - demo: leer
      // Wir gehen davon aus, dass die Kundenliste (Demo) synchron ist.
      // TODO: echte Daten!
      const formattedUsers = profiles.map(profile => ({
        id: profile.id,
        email: "", // Email aus profile nicht lesbar
        role: (profile.role || 'client') as UserRole,
        firstName: profile["Full Name"] || undefined,
        createdAt: profile.created_at,
        is_active: profile.is_active ?? true,
        customers: [], // TODO: Kunden laden
      }));

      setUsers(formattedUsers);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer konnten nicht geladen werden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Aktiv/Inaktiv schalten
  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users =>
        users.map(u =>
          u.id === userId ? { ...u, is_active: !isActive } : u
        )
      );
      toast({
        title: `Benutzer ${!isActive ? "aktiviert" : "deaktiviert"}`,
        description: `Der Benutzer ist jetzt ${!isActive ? "aktiv" : "inaktiv"}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Status konnte nicht geändert werden.",
      });
    }
  };

  // Rolle & Kunden aktualisieren + Aktiv-Status
  const handleSave = async (user: User & { customers: Customer[]; is_active: boolean }) => {
    try {
      if (user.id) {
        // Profile: Role, Name, is_active
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: user.role,
            "Full Name": user.firstName || '',
            is_active: user.is_active
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // TODO: Kunden-Zuweisung (user_customer_assignments) synchronisieren

        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, ...user } : u))
        );

        toast({
          title: "Benutzer aktualisiert",
          description: "Der Benutzer wurde aktualisiert.",
        });
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

  // Bearbeiten-Dialog öffnen
  const handleEdit = (user: User & { customers: Customer[], is_active: boolean }) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  // Nutzer löschen
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUsers(users => users.filter(user => user.id !== id));
      toast({
        title: "Benutzer gelöscht",
        description: "Das Profil wurde gelöscht.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Der Benutzer konnte nicht gelöscht werden.",
      });
    }
  };

  // Passwort zurücksetzen: bleibt wie gehabt
  const handleResetPassword = async (id: string) => {
    toast({
      variant: "destructive",
      title: "Nicht implementiert",
      description: "Das Zurücksetzen des Passworts erfordert die E-Mail-Adresse oder eine serverseitige Funktion.",
    });
  };

  const handleCreate = () => {
    setEditUser(null);
    setDialogOpen(true);
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
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-avanti-600"></div>
            </div>
          ) : users.length > 0 ? (
            <UserListTable
              users={users}
              customers={mockCustomers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onResetPassword={handleResetPassword}
              onToggleActive={handleToggleActive}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              Keine Benutzer gefunden. Klicke auf "Neu anlegen", um einen Benutzer zu erstellen.
            </div>
          )}
        </CardContent>
      </Card>
      <UserEditDialog
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
