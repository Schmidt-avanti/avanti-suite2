
import React from "react";
import { useWhatsappAccounts } from "@/hooks/useWhatsappAccounts";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

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
                <Badge variant={acc.status === "active" ? "default" : "outline"}>
                  {acc.status ?? "-"}
                </Badge>
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
