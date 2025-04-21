
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, KeyRound, ToggleRight, ToggleLeft } from "lucide-react";
import { User, Customer } from "@/types";

interface Props {
  users: (User & { customers: Customer[], is_active: boolean })[];
  customers: Customer[];
  onEdit: (user: User & { customers: Customer[], is_active: boolean }) => void;
  onDelete: (id: string) => void;
  onResetPassword: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const UserListTable: React.FC<Props> = ({
  users,
  onEdit,
  onDelete,
  onResetPassword,
  onToggleActive
}) => (
  <div className="overflow-x-auto rounded-2xl border bg-white shadow">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Rolle</TableHead>
          <TableHead>Status</TableHead>
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
              {user.is_active
                ? <span className="inline-flex items-center rounded-xl px-2 py-1 text-xs bg-green-50 text-green-700 gap-1"><ToggleRight className="w-4 h-4" />Aktiv</span>
                : <span className="inline-flex items-center rounded-xl px-2 py-1 text-xs bg-gray-100 text-gray-500 gap-1"><ToggleLeft className="w-4 h-4" />Inaktiv</span>
              }
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
                <Button
                  size="icon"
                  variant={user.is_active ? "outline" : "secondary"}
                  onClick={() => onToggleActive(user.id, user.is_active)}
                  title={user.is_active ? "Deaktivieren" : "Aktivieren"}
                >
                  {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  <span className="sr-only">{user.is_active ? "Deaktivieren" : "Aktivieren"}</span>
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
