
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoiceData, DailyMinutesRecord } from "@/hooks/useInvoiceData";
import { format } from "date-fns";

interface InvoiceTableProps {
  customerId: string;
  from: Date;
  to: Date;
}

export function InvoiceTable({ customerId, from, to }: InvoiceTableProps) {
  const { data, isLoading, error } = useInvoiceData(customerId, from, to);

  if (error) {
    console.error("Fehler beim Laden der Rechnungsdaten:", error);
    return <div className="text-red-500">Fehler beim Laden der Daten. Bitte versuchen Sie es erneut.</div>;
  }

  if (isLoading) {
    return <div className="py-4 text-center text-muted-foreground">Lade Daten...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="py-4 text-center text-muted-foreground">Keine Daten für den ausgewählten Zeitraum gefunden.</div>;
  }

  // Berechne Summe der Minuten
  const totalMinutes = data.reduce((sum, row) => sum + row.minutes, 0);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead className="text-right">Minuten</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row: DailyMinutesRecord) => (
            <TableRow key={row.date}>
              <TableCell>{format(new Date(row.date), "dd.MM.yyyy")}</TableCell>
              <TableCell className="text-right">{row.minutes}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold">
            <TableCell>Gesamt</TableCell>
            <TableCell className="text-right">{totalMinutes}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
