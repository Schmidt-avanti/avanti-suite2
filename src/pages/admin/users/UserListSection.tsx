
import React, { useEffect, useState } from "react";
import UserListTable from "./UserListTable";
import { User, UserRole, Customer } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface UserListSectionProps {
  customers: Customer[];
  onEditUser: (user: User & { customers: Customer[]; is_active: boolean }) => void;
  onOpenDialog: () => void;
  setUsers: React.Dispatch<React.SetStateAction<(User & { customers: Customer[]; is_active: boolean })[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  users: (User & { customers: Customer[]; is_active: boolean })[];
  isLoading: boolean;
}

const UserListSection: React.FC<UserListSectionProps> = ({
  customers,
  onEditUser,
  setUsers,
  users,
  setIsLoading,
  isLoading,
}) => {
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, "Full Name", created_at, is_active');
      if (profilesError) throw profilesError;

      console.log('Fetched profiles:', profiles);

      // Get auth users for email addresses
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      // Create email map
      let emailMap: Record<string, string> = {};
      
      if (!authError && authUsers?.users) {
        // Type for Auth-User
        interface AuthUser {
          id: string;
          email?: string;
          [key: string]: any;
        }
        
        const usersArray = authUsers.users as AuthUser[];
        
        emailMap = usersArray.reduce((acc: Record<string, string>, user: AuthUser) => {
          if (user && typeof user.id === 'string') {
            acc[user.id] = user.email || '';
          }
          return acc;
        }, {} as Record<string, string>);
      }

      console.log('Email map created:', emailMap);

      // Get customer assignments for all users
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_customer_assignments')
        .select('user_id, customer_id');

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Fetched assignments:', assignments);

      // Group assignments by user ID
      const userAssignments: Record<string, string[]> = {};
      assignments?.forEach(assignment => {
        if (!userAssignments[assignment.user_id]) {
          userAssignments[assignment.user_id] = [];
        }
        userAssignments[assignment.user_id].push(assignment.customer_id);
      });

      console.log('Grouped assignments by user:', userAssignments);

      // Format users with customer assignments
      const formattedUsers = profiles.map(profile => {
        // Get customer IDs for current user
        const customerIds = userAssignments[profile.id] || [];
        // Find customer objects for each ID
        const userCustomers = customers.filter(customer => 
          customerIds.includes(customer.id)
        );

        console.log(`User ${profile.id} has customers:`, userCustomers);

        const fullName = profile["Full Name"] || "";
        
        return {
          id: profile.id,
          email: emailMap[profile.id] || "",
          role: (profile.role || 'client') as UserRole,
          fullName: fullName,
          firstName: fullName.split(' ')[0] || "",
          lastName: fullName.split(' ')[1] || undefined,
          createdAt: profile.created_at,
          is_active: profile.is_active ?? true,
          customers: userCustomers,
          name: fullName,
        };
      });

      setUsers(formattedUsers);
    } catch (error) {
      console.error("Fehler beim Laden der Benutzer:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer konnten nicht geladen werden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Aktiv/Inaktiv umschalten
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

  // Löschen
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(id);

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

  // Passwort zurücksetzen
  const handleResetPassword = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user?.email) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Keine E-Mail-Adresse für diesen Benutzer verfügbar",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + '/auth/reset-password',
      });

      if (error) throw error;

      toast({
        title: "Passwort-Link versendet",
        description: `Ein Link zum Zurücksetzen des Passworts wurde an ${user.email} gesendet.`,
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
    <>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-avanti-600"></div>
        </div>
      ) : users.length > 0 ? (
        <UserListTable
          users={users}
          customers={customers}
          onEdit={onEditUser}
          onDelete={handleDelete}
          onResetPassword={handleResetPassword}
          onToggleActive={handleToggleActive}
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          Keine Benutzer gefunden. Klicke auf "Neu anlegen", um einen Benutzer zu erstellen.
        </div>
      )}
    </>
  );
};

export default UserListSection;
