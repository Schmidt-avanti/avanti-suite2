
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentDataPage = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Zahlungsdaten</h1>
      <Card>
        <CardHeader>
          <CardTitle>Zahlungsinformationen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Dieser Bereich wird in Zukunft zur Verwaltung von Zahlungsinformationen, 
            Zahlungshistorien und Kontodaten verwendet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentDataPage;
