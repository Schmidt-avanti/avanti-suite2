
import React, { useEffect, useState } from "react";
import UserListTable from "./UserListTable";
import { User, UserRole, Customer } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredUsers, setFilteredUsers] = useState<(User & { customers: Customer[]; is_active: boolean })[]>([]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  // Filtern der Benutzer basierend auf dem Suchbegriff
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = users.filter(user => {
      // Nach Name, E-Mail, Rolle oder zugewiesenen Kunden suchen
      const nameMatch = user.firstName?.toLowerCase().includes(lowerSearchTerm) || false;
      const emailMatch = user.email?.toLowerCase().includes(lowerSearchTerm) || false;
      const roleMatch = user.role?.toLowerCase().includes(lowerSearchTerm) || false;
      const customerMatch = user.customers.some(customer => 
        customer.name.toLowerCase().includes(lowerSearchTerm)
      );

      return nameMatch || emailMatch || roleMatch || customerMatch;
    });

    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, "Full Name", created_at, is_active, email');
      if (profilesError) throw profilesError;

      // Always fetch customers fresh here for mapping
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, created_at');
      if (customersError) throw customersError;

      // Get customer assignments for all users
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_customer_assignments')
        .select('user_id, customer_id');
      if (assignmentsError) throw assignmentsError;

      // Group assignments by user ID
      const userAssignments: Record<string, string[]> = {};
      assignments?.forEach(assignment => {
        if (!userAssignments[assignment.user_id]) {
          userAssignments[assignment.user_id] = [];
        }
        userAssignments[assignment.user_id].push(assignment.customer_id);
      });

      // Format users with customer assignments (using up-to-date customers)
      const formattedUsers = profiles.map(profile => {
        const customerIds = userAssignments[profile.id] || [];
        const userCustomers = customersData.filter((customer: Customer) =>
          customerIds.includes(customer.id)
        );
        return {
          id: profile.id,
          email: profile.email || "",
          role: (profile.role || 'client') as UserRole,
          firstName: profile["Full Name"] || undefined,
          createdAt: profile.created_at,
          is_active: profile.is_active ?? true,
          customers: userCustomers,
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
      // Remove user from edge function call
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { action: 'delete', userId: id }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Refresh the user list
      fetchUsers();
      
      toast({
        title: "Benutzer gelöscht",
        description: "Das Profil wurde gelöscht.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Der Benutzer konnte nicht gelöscht werden: " + (error.message || "Unbekannter Fehler"),
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
    <div className="space-y-4 pt-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Nutzer suchen nach Name, E-Mail, Rolle oder Kunde..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-avanti-600"></div>
        </div>
      ) : searchTerm && filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Keine Benutzer für "{searchTerm}" gefunden
        </div>
      ) : users.length > 0 ? (
        <UserListTable
          users={searchTerm ? filteredUsers : users}
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
    </div>
  );
};

export default UserListSection;
