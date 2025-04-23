
import React from "react";
import { useWhatsappAccounts } from "@/hooks/useWhatsappAccounts";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export interface CustomerMap {
  [id: string]: string;
}

const WhatsappAccountsTable: React.FC<{ customerMap: CustomerMap; refreshFlag?: number }> = ({
  customerMap,
  refreshFlag = 0,
}) => {
  const { accounts, loading, refetch } = useWhatsappAccounts();

  React.useEffect(() => {
    refetch && refetch();
  }, [refreshFlag, refetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground mr-2" />
        <span>Lade WhatsApp Konten…</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return <div className="text-muted-foreground px-2 py-8">Keine WhatsApp Konten vorhanden.</div>;
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">unbekannt</Badge>;

    switch (status.toLowerCase()) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Aktiv</span>
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>Inaktiv</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-soft border p-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kunde</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Nummer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right pr-6">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((acc) => (
            <TableRow key={acc.id}>
              <TableCell>{customerMap[acc.customer_id] ?? <span className="text-gray-400">–</span>}</TableCell>
              <TableCell>{acc.name ?? <span className="text-gray-400">–</span>}</TableCell>
              <TableCell>{acc.pphone_number ?? <span className="text-gray-400">–</span>}</TableCell>
              <TableCell>
                {getStatusBadge(acc.status)}
              </TableCell>
              <TableCell className="text-right pr-6">
                {/* Aktionen können ergänzt werden */}
                <span className="text-muted-foreground">–</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WhatsappAccountsTable;
