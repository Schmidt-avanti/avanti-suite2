import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { User, UserRole, Customer } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserListSection from "./users/UserListSection";
import UserEditSection from "./users/UserEditSection";
import { useFetchCustomers } from "./users/useFetchCustomers";

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState<(User & { customers: Customer[], is_active: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editUser, setEditUser] = useState<(User & { customers: Customer[], is_active: boolean })|null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { customers: realCustomers, loading: loadingCustomers } = useFetchCustomers();

  const handleEdit = (user: User & { customers: Customer[], is_active: boolean }) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditUser(null);
    setDialogOpen(true);
  };

  const saveCustomerAssignments = async (userId: string, customerIds: string[]) => {
    try {
      console.log('Saving customer assignments for user:', userId, 'customers:', customerIds);
      
      const { error: deleteError } = await supabase
        .from('user_customer_assignments')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('Error deleting existing assignments:', deleteError);
        throw deleteError;
      }
      
      if (customerIds.length === 0) {
        console.log('No customers to assign, finished.');
        return;
      }
      
      const assignments = customerIds.map(customerId => ({
        user_id: userId,
        customer_id: customerId
      }));
      
      console.log('Creating new assignments:', assignments);
      
      const { data, error: insertError } = await supabase
        .from('user_customer_assignments')
        .insert(assignments)
        .select();
      
      if (insertError) {
        console.error('Error inserting assignments:', insertError);
        throw insertError;
      }
      
      console.log('Assignments saved successfully:', data);
    } catch (error) {
      console.error("Fehler beim Speichern der Kundenzuweisungen:", error);
      throw error;
    }
  };

  const handleSave = async (user: User & { customers: Customer[]; is_active: boolean; name: string }) => {
    try {
      if (user.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: user.role,
            "Full Name": user.name || '',
            is_active: user.is_active
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        await saveCustomerAssignments(
          user.id, 
          user.customers.map(c => c.id)
        );

        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, ...user, firstName: user.name } : u))
        );

        toast({
          title: "Benutzer aktualisiert",
          description: "Der Benutzer wurde aktualisiert.",
        });
      } else {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: user.email,
            password: "W1llkommen@avanti",
            userData: {
              role: user.role,
              "Full Name": user.name,
              needs_password_reset: true
            }
          }
        });

        if (error) throw error;

        if (data?.userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.userId,
              role: user.role, 
              "Full Name": user.name,
              is_active: true
            });
            
          if (profileError) throw profileError;

          await saveCustomerAssignments(
            data.userId, 
            user.customers.map(c => c.id)
          );

          const newUser: User & { customers: Customer[], is_active: boolean } = {
            id: data.userId,
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
            customers={realCustomers}
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
        defaultValues={editUser ?? undefined}
      />
    </div>
  );
};

export default UsersAdminPage;
