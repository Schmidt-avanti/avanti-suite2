
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Address {
  street: string;
  zip: string;
  city: string;
}

interface CustomerData {
  name: string;
  branch: string;
  email: string;
  address: Address;
  hasInvoiceAddress: boolean;
  invoiceAddress: Address;
}

interface Props {
  customer?: any;
  setCustomer?: (customer: any) => void;
}

const CustomerMasterDataStep: React.FC<Props> = ({ customer, setCustomer }) => {
  if (!customer || !setCustomer) {
    console.warn("CustomerMasterDataStep: customer or setCustomer props are missing");
    return <div>Loading...</div>;
  }
  
  const handleChange = (field: string, value: any) => {
    setCustomer({
      ...customer,
      [field]: value
    });
  };
  
  const handleAddressChange = (field: string, value: string) => {
    setCustomer({
      ...customer,
      address: {
        ...customer.address,
        [field]: value
      }
    });
  };
  
  const handleInvoiceAddressChange = (field: string, value: string) => {
    setCustomer({
      ...customer,
      invoiceAddress: {
        ...customer.invoiceAddress,
        [field]: value
      }
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Firmenname *</Label>
          <Input
            id="name"
            value={customer.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Firmenname"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="branch">Branche *</Label>
          <Input
            id="branch"
            value={customer.branch || ""}
            onChange={(e) => handleChange("branch", e.target.value)}
            placeholder="z. B. IT, Handwerk, Dienstleistung"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="email">Allgemeine E-Mail-Adresse *</Label>
          <Input
            id="email"
            type="email"
            value={customer.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="allgemein@firma.de"
            required
          />
        </div>
      </div>
      
      <div>
        <h3 className="font-medium mb-2">Adresse *</h3>
        <div className="space-y-2">
          <Input
            value={customer.address?.street || ""}
            onChange={(e) => handleAddressChange("street", e.target.value)}
            placeholder="Straße und Hausnummer"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={customer.address?.zip || ""}
              onChange={(e) => handleAddressChange("zip", e.target.value)}
              placeholder="PLZ"
              required
            />
            <Input
              value={customer.address?.city || ""}
              onChange={(e) => handleAddressChange("city", e.target.value)}
              placeholder="Ort"
              required
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="hasInvoiceAddress" 
            checked={customer.hasInvoiceAddress || false}
            onCheckedChange={(checked) => handleChange("hasInvoiceAddress", checked)}
          />
          <Label htmlFor="hasInvoiceAddress">Abweichende Rechnungsadresse</Label>
        </div>
        
        {customer.hasInvoiceAddress && (
          <div className="pl-6 space-y-2 mt-2">
            <Input
              value={customer.invoiceAddress?.street || ""}
              onChange={(e) => handleInvoiceAddressChange("street", e.target.value)}
              placeholder="Straße und Hausnummer"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={customer.invoiceAddress?.zip || ""}
                onChange={(e) => handleInvoiceAddressChange("zip", e.target.value)}
                placeholder="PLZ"
              />
              <Input
                value={customer.invoiceAddress?.city || ""}
                onChange={(e) => handleInvoiceAddressChange("city", e.target.value)}
                placeholder="Ort"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerMasterDataStep;
