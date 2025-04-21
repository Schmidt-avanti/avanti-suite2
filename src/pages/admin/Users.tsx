
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { User, UserRole, Customer } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserListTable from "./users/UserListTable";
import UserEditDialog from "./users/UserEditDialog";

// Mockdaten für Kunden
const mockCustomers: Customer[] = [
  { id: "c1", name: "Acme Corp", createdAt: "" },
  { id: "c2", name: "Globex GmbH", createdAt: "" },
  { id: "c3", name: "Widget AG", createdAt: "" },
];

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState<(User & { customers: Customer[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editUser, setEditUser] = useState<(User & { customers: Customer[] })|null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        throw authError;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, "Full Name"');

      if (profilesError) {
        throw profilesError;
      }

      // Kombinieren von Auth-Usern und Profilen
      const combinedUsers = authUsers.users.map(authUser => {
        const profile = profiles.find(p => p.id === authUser.id);
        
        return {
          id: authUser.id,
          email: authUser.email || '',
          role: (profile?.role || 'client') as UserRole,
          firstName: profile?.["Full Name"] || undefined,
          createdAt: authUser.created_at,
          customers: [] as Customer[], // In Zukunft: echte Kundenzuordnungen aus DB
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer konnten nicht geladen werden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: User & { customers: Customer[] }) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(id);
      
      if (error) throw error;
      
      setUsers(users.filter(user => user.id !== id));
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Benutzers:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Der Benutzer konnte nicht gelöscht werden.",
      });
    }
  };

  const handleSave = async (user: User & { customers: Customer[] }) => {
    try {
      if (user.id) {
        // Bestehenden Nutzer aktualisieren
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            role: user.role,
            "Full Name": user.firstName || ''
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // Aktualisiere lokalen State
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, ...user } : u))
        );

        toast({
          title: "Benutzer aktualisiert",
          description: "Der Benutzer wurde erfolgreich aktualisiert.",
        });
      } else {
        // Neuen Nutzer anlegen
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(user.email, {
          data: {
            role: user.role,
            name: user.firstName || ''
          }
        });

        if (error) throw error;

        if (data.user) {
          // Profil erstellen
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              role: user.role,
              "Full Name": user.firstName || ''
            });

          if (profileError) throw profileError;

          // Aktualisiere lokalen State
          const newUser = {
            ...user,
            id: data.user.id,
            createdAt: data.user.created_at || new Date().toISOString()
          };
          
          setUsers(prev => [...prev, newUser]);

          toast({
            title: "Einladung gesendet",
            description: `Eine Einladung wurde an ${user.email} gesendet.`,
          });
        }
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern des Benutzers:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Der Benutzer konnte nicht gespeichert werden.",
      });
    } finally {
      setDialogOpen(false);
      setEditUser(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const user = users.find(u => u.id === id);
      if (!user?.email) throw new Error("E-Mail nicht gefunden");

      // Passwort-Reset-Link senden
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Passwort-Reset gesendet",
        description: `Ein Passwort-Reset-Link wurde an ${user.email} gesendet.`,
      });
    } catch (error: any) {
      console.error('Fehler beim Zurücksetzen des Passworts:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Passwort konnte nicht zurückgesetzt werden.",
      });
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
