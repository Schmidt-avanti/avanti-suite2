
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, KeyRound } from "lucide-react";
import { User, UserRole, Customer } from "@/types";
import UserListTable from "./users/UserListTable";
import UserEditDialog from "./users/UserEditDialog";

const mockCustomers: Customer[] = [
  { id: "c1", name: "Acme Corp", createdAt: "" },
  { id: "c2", name: "Globex GmbH", createdAt: "" },
  { id: "c3", name: "Widget AG", createdAt: "" },
];

const initialUsers: (User & { customers: Customer[] })[] = [
  {
    id: "u1",
    email: "alice@acme.com",
    role: "agent",
    customers: [mockCustomers[0]],
    createdAt: "",
  },
  {
    id: "u2",
    email: "bob@example.com",
    role: "customer",
    customers: [mockCustomers[1]],
    createdAt: "",
  },
  {
    id: "u3",
    email: "carol@admin.com",
    role: "admin",
    customers: [],
    createdAt: "",
  },
];

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState(initialUsers);
  const [editUser, setEditUser] = useState<(User & { customers: Customer[] })|null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const handleCreate = () => {
    setEditUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: User & { customers: Customer[] }) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setUsers(u => u.filter(user => user.id !== id));
  };

  const handleSave = (user: User & { customers: Customer[] }) => {
    if (user.id.startsWith("u")) {
      // Edit mode
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...user } : u))
      );
    } else {
      // Create mode (generates fake id)
      setUsers(prev => [
        ...prev,
        { ...user, id: `u${Date.now()}` }
      ]);
    }
    setDialogOpen(false);
    setEditUser(null);
  };

  const handleResetPassword = (id: string) => {
    // Placeholder: show toast/notification
    alert("Passwort-Reset-Link wurde versendet (Demo)");
  };

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Nutzerverwaltung</CardTitle>
          <Button onClick={handleCreate} className="gap-2" size="sm">
            <Plus /> Neu anlegen
          </Button>
        </CardHeader>
        <CardContent>
          <UserListTable
            users={users}
            customers={mockCustomers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onResetPassword={handleResetPassword}
          />
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
