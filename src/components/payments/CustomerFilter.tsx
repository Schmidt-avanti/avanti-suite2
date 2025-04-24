
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers } from "@/hooks/useCustomers";

interface CustomerFilterProps {
  selectedCustomerId?: string;
  onSelectCustomer: (customerId: string) => void;
}

export const CustomerFilter = ({ selectedCustomerId, onSelectCustomer }: CustomerFilterProps) => {
  const { customers, isLoading } = useCustomers();

  if (isLoading) {
    return <div>Lade Kunden...</div>;
  }

  return (
    <Select value={selectedCustomerId} onValueChange={onSelectCustomer}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Kunde auswählen..." />
      </SelectTrigger>
      <SelectContent>
        {customers.map((customer) => (
          <SelectItem key={customer.id} value={customer.id}>
            {customer.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
