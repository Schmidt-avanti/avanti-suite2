
import React, { useState, useEffect } from "react";
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
  const [forceSkipDuplicateCheck, setForceSkipDuplicateCheck] = useState(false);
  const { toast } = useToast();

  const { customers: realCustomers, loading: loadingCustomers } = useFetchCustomers();

  const handleEdit = (user: User & { customers: Customer[], is_active: boolean }) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditUser(null);
    setDialogOpen(true);
    setForceSkipDuplicateCheck(false); // Reset this when opening the dialog
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
        // Updating existing user
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: user.role,
            "Full Name": user.name || '',
            is_active: user.is_active,
            email: user.email // Save email to profile table
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
        try {
          // Creating new user via edge function
          const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
              action: 'create',
              email: user.email,
              password: "W1llkommen@avanti",
              skipDuplicateCheck: forceSkipDuplicateCheck, // Use the flag to bypass duplicate check if needed
              userData: {
                role: user.role,
                "Full Name": user.name,
                needs_password_reset: true,
                is_active: true
              }
            }
          });

          if (error) {
            throw error;
          }

          if (data?.error) {
            // Handle API-level errors
            if (data.code === 'EMAIL_EXISTS') {
              toast({
                variant: "destructive",
                title: "Fehler bei der Benutzerregistrierung",
                description: data.error || "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.",
              });
              
              // Provide option to force creation
              const shouldForce = confirm(
                "Es scheint ein Problem mit der E-Mail-Prüfung zu geben. Möchten Sie versuchen, den Benutzer trotzdem anzulegen?"
              );
              
              if (shouldForce) {
                setForceSkipDuplicateCheck(true);
                // Retry immediately with skip flag
                const { data: retryData, error: retryError } = await supabase.functions.invoke('create-user', {
                  body: {
                    action: 'create',
                    email: user.email,
                    password: "W1llkommen@avanti",
                    skipDuplicateCheck: true,
                    userData: {
                      role: user.role,
                      "Full Name": user.name,
                      needs_password_reset: true,
                      is_active: true
                    }
                  }
                });
                
                if (retryError) throw retryError;
                
                if (retryData?.error) {
                  throw new Error(retryData.error);
                }
                
                if (retryData?.userId) {
                  await saveCustomerAssignments(
                    retryData.userId, 
                    user.customers.map(c => c.id)
                  );

                  const newUser: User & { customers: Customer[], is_active: boolean } = {
                    id: retryData.userId,
                    email: user.email,
                    role: user.role,
                    createdAt: new Date().toISOString(),
                    customers: user.customers,
                    is_active: true,
                    firstName: user.name
                  };
                  
                  setUsers(prev => [...prev, newUser]);
                  
                  toast({
                    title: "Benutzer angelegt (Duplikatsprüfung übersprungen)",
                    description: `Der Benutzer wurde erfolgreich angelegt. Passwort: W1llkommen@avanti`,
                  });
                  
                  setDialogOpen(false);
                  setEditUser(null);
                  return;
                }
              }
              return;
            } else {
              throw new Error(data.error);
            }
          }

          if (data?.userId) {
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
        } catch (apiError: any) {
          // Handle network or other errors
          console.error("API error:", apiError);
          
          // Check if it's an email exists error
          if (apiError.message && (
              apiError.message.includes('already been registered') ||
              apiError.message.includes('existiert bereits')
          )) {
            toast({
              variant: "destructive",
              title: "E-Mail-Adresse existiert bereits",
              description: "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.",
            });
            
            // Provide option to force creation
            const shouldForce = confirm(
              "Es scheint ein Problem mit der E-Mail-Prüfung zu geben. Möchten Sie versuchen, den Benutzer trotzdem anzulegen?"
            );
            
            if (shouldForce) {
              setForceSkipDuplicateCheck(true);
              // Don't automatically retry - let the user click save again
              return;
            }
          } else {
            throw apiError;
          }
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
      if (!forceSkipDuplicateCheck) {
        setDialogOpen(false);
        setEditUser(null);
      }
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
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setForceSkipDuplicateCheck(false);
        }}
        onSave={handleSave}
        defaultValues={editUser ?? undefined}
      />
    </div>
  );
};

export default UsersAdminPage;
