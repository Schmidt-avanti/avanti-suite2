
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
  <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/30">
          <TableHead className="font-medium text-foreground">ID</TableHead>
          <TableHead className="font-medium text-foreground">Name</TableHead>
          <TableHead className="font-medium text-foreground">Rolle</TableHead>
          <TableHead className="font-medium text-foreground">Status</TableHead>
          <TableHead className="font-medium text-foreground">Zugeordnete Kunden</TableHead>
          <TableHead className="font-medium text-foreground">Aktionen</TableHead>
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
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-avanti-100 text-avanti-800">
                {user.role}
              </span>
            </TableCell>
            <TableCell>
              {user.is_active
                ? <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 gap-1"><ToggleRight className="w-4 h-4" />Aktiv</span>
                : <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 gap-1"><ToggleLeft className="w-4 h-4" />Inaktiv</span>
              }
            </TableCell>
            <TableCell>
              {user.role !== 'admin' && (!user.customers || user.customers.length === 0) ? (
                <span className="text-red-500 italic text-xs">Keine Kunden zugeordnet</span>
              ) : user.customers && user.customers.length > 0 ? (
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
