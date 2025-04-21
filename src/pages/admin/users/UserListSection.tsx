
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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, "Full Name", created_at, is_active');
      if (profilesError) throw profilesError;

      // Hole optional E-Mail-Adressen aus auth.users (nur für Admins möglich)
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      // Create an email map from auth users data
      let emailMap: Record<string, string> = {};
      
      if (!authError && authUsers?.users) {
        // Define the expected shape of a user object from auth.users
        interface AuthUser {
          id: string;
          email?: string;
          [key: string]: any; // For other properties we don't care about now
        }
        
        // Explicitly cast the users array to the correct type
        const usersArray = authUsers.users as AuthUser[];
        
        // Now use the typed array in the reduce function
        emailMap = usersArray.reduce((acc: Record<string, string>, user: AuthUser) => {
          if (user && typeof user.id === 'string') {
            acc[user.id] = user.email || '';
          }
          return acc;
        }, {} as Record<string, string>);
      }

      // TODO: Laden von Kunden-Zuweisung per echte Daten aus user_customer_assignments
      const formattedUsers = profiles.map(profile => ({
        id: profile.id,
        email: emailMap[profile.id] || "",
        role: (profile.role || 'client') as UserRole,
        firstName: profile["Full Name"] || undefined,
        createdAt: profile.created_at,
        is_active: profile.is_active ?? true,
        customers: [],
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
