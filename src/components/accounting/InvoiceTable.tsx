
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoiceData } from "@/hooks/useInvoiceData";
import { format } from "date-fns";

interface InvoiceTableProps {
  customerId: string;
  from: Date;
  to: Date;
}

export function InvoiceTable({ customerId, from, to }: InvoiceTableProps) {
  const { data, isLoading } = useInvoiceData(customerId, from, to);

  if (isLoading) {
    return <div>Lade Daten...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead className="text-right">Minuten gesamt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.date}>
            <TableCell>{format(new Date(row.date), "dd.MM.yyyy")}</TableCell>
            <TableCell className="text-right">{row.minutes} Min</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
