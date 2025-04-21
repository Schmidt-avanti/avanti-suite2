
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { User, UserRole, Customer } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserListSection from "./users/UserListSection";
import UserEditSection from "./users/UserEditSection";

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

  const handleEdit = (user: User & { customers: Customer[], is_active: boolean }) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditUser(null);
    setDialogOpen(true);
  };

  const handleSave = async (user: User & { customers: Customer[]; is_active: boolean; name: string }) => {
    try {
      if (user.id) {
        // Update existing user
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: user.role,
            "Full Name": user.name || '',
            is_active: user.is_active
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, ...user, firstName: user.name } : u))
        );

        toast({
          title: "Benutzer aktualisiert",
          description: "Der Benutzer wurde aktualisiert.",
        });
      } else {
        // Create new user using signUp instead of admin.createUser
        // This bypasses the admin API requirement but requires admin to handle profile creation
        const { data, error } = await supabase.auth.signUp({
          email: user.email,
          password: "W1llkommen@avanti",
          options: {
            data: {
              role: user.role,
              "Full Name": user.name,
              needs_password_reset: true
            }
          }
        });

        if (error) throw error;

        if (data?.user) {
          // Also create a profile for the new user
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              role: user.role, 
              "Full Name": user.name,
              is_active: true
            });
            
          if (profileError) throw profileError;

          const newUser: User & { customers: Customer[], is_active: boolean } = {
            id: data.user.id,
            email: user.email,
            role: user.role,
            createdAt: new Date().toISOString(),
            customers: user.customers,
            is_active: true,
            firstName: user.name
          };
          
          setUsers(prev => [...prev, newUser]);
          
          toast({
            title: "Benutzer angelegt",
            description: `Der Benutzer wurde erfolgreich angelegt. Passwort: W1llkommen@avanti`,
          });
        }
      }
    } catch (error: any) {
      console.error("User save error:", error);
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
