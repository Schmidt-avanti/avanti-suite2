
import { Card, CardContent } from "@/components/ui/card";
import { useInvoiceCalculation } from "@/hooks/useInvoiceCalculation";

interface InvoiceSummaryProps {
  customerId: string;
  from: Date;
  to: Date;
}

export function InvoiceSummary({ customerId, from, to }: InvoiceSummaryProps) {
  const { data, isLoading, error } = useInvoiceCalculation(customerId, from, to);

  if (error) {
    console.error("Fehler bei der Berechnung:", error);
    return <div className="text-red-500">Fehler bei der Berechnung. Bitte versuchen Sie es erneut.</div>;
  }

  if (isLoading) {
    return <div>Berechne...</div>;
  }

  if (!data) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Gesamtsumme:</span>
            <span>{data.totalMinutes} Min</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Freiminuten:</span>
            <span>-1.000 Min</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Verrechenbare Minuten:</span>
            <span>{data.billableMinutes} Min</span>
          </div>
          <div className="flex justify-between">
            <span>Nettobetrag:</span>
            <span>{data.netAmount.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>USt. 19%:</span>
            <span>{data.vat.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Gesamtbetrag:</span>
            <span>{data.totalAmount.toFixed(2)} €</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
