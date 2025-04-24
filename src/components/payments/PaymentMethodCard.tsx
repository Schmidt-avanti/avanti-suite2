
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PaymentMethodCardProps {
  type: 'paypal' | 'creditcard';
  value: string;
  cardHolder?: string;
  expiryMonth?: number;
  expiryYear?: number;
  onEdit: () => void;
  onDelete: () => void;
}

export const PaymentMethodCard = ({ 
  type, 
  value, 
  cardHolder,
  expiryMonth,
  expiryYear,
  onEdit, 
  onDelete 
}: PaymentMethodCardProps) => {
  const maskedValue = type === 'creditcard' 
    ? `**** **** **** ${value.slice(-4)}`
    : value.replace(/(.)(.*)(.@.*)/, '$1***$3');

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-2">
        <CreditCard className="h-5 w-5" />
        <span className="font-semibold capitalize">{type}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground">{maskedValue}</p>
        {type === 'creditcard' && cardHolder && (
          <>
            <p className="text-sm">{cardHolder}</p>
            <p className="text-sm text-muted-foreground">
              Gültig bis: {expiryMonth?.toString().padStart(2, '0')}/{expiryYear}
            </p>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Bearbeiten
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Entfernen
        </Button>
      </CardFooter>
    </Card>
  );
};
