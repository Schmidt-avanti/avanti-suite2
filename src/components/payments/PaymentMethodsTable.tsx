import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PaymentMethod } from "@/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";

interface PaymentMethodsTableProps {
  paymentMethods: (PaymentMethod & { customers: { name: string } })[];
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
}

export const PaymentMethodsTable = ({
  paymentMethods,
  onEdit,
  onDelete,
}: PaymentMethodsTableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PaymentMethod;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });

  const sortedMethods = [...paymentMethods].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof PaymentMethod) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kunde</TableHead>
          <TableHead>Zahlungsart</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Letzte Änderung</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedMethods.map((method) => {
          const maskedValue = method.type === 'creditcard'
            ? `**** **** **** ${method.value.slice(-4)}`
            : method.value.replace(/(.)(.*)(.@.*)/, '$1***$3');

          return (
            <TableRow key={method.id}>
              <TableCell>{method.customers?.name || 'N/A'}</TableCell>
              <TableCell className="capitalize">{method.type}</TableCell>
              <TableCell>{maskedValue}</TableCell>
              <TableCell>
                {format(new Date(method.updated_at), 'Pp', { locale: de })}
              </TableCell>
              <TableCell>
                {method.active ? 'Aktiv' : 'Inaktiv'}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(method)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(method)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
