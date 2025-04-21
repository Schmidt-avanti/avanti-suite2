
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, KeyRound } from "lucide-react";
import { User, Customer } from "@/types";

interface Props {
  users: (User & { customers: Customer[] })[];
  customers: Customer[];
  onEdit: (user: User & { customers: Customer[] }) => void;
  onDelete: (id: string) => void;
  onResetPassword: (id: string) => void;
}

const UserListTable: React.FC<Props> = ({ users, onEdit, onDelete, onResetPassword }) => (
  <div className="overflow-x-auto rounded-2xl border bg-white shadow">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Rolle</TableHead>
          <TableHead>Zugeordnete Kunden</TableHead>
          <TableHead>Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <span className="text-xs text-gray-500 font-mono">
                {user.id.substring(0, 8)}...
              </span>
            </TableCell>
            <TableCell>{user.firstName || 'Kein Name'}</TableCell>
            <TableCell>
              <span className="rounded px-2 py-1 bg-avanti-100 text-avanti-800 text-xs font-medium">{user.role}</span>
            </TableCell>
            <TableCell>
              {user.customers?.length ? (
                user.customers.map(c => c.name).join(", ")
              ) : (
                <span className="text-gray-400 italic text-xs">Keine</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => onEdit(user)}>
                  <Edit className="w-4 h-4" />
                  <span className="sr-only">Bearbeiten</span>
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onResetPassword(user.id)}>
                  <KeyRound className="w-4 h-4" />
                  <span className="sr-only">Passwort zurücksetzen</span>
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(user.id)}>
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">Löschen</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default UserListTable;
