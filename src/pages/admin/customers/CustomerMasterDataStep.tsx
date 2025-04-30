
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface Address {
  street: string;
  zip: string;
  city: string;
}

interface FormState {
  name: string;
  branch: string;
  email: string;
  avanti_email: string;
  address: Address;
  hasInvoiceAddress: boolean;
  invoiceAddress: Address;
}

interface Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

const CustomerMasterDataStep: React.FC<Props> = ({ form, setForm }) => {
  const updateForm = <T extends keyof FormState>(field: T, value: FormState[T]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddress = (field: keyof Address, value: string) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const updateInvoiceAddress = (field: keyof Address, value: string) => {
    setForm((prev) => ({
      ...prev,
      invoiceAddress: { ...prev.invoiceAddress, [field]: value }
    }));
  };

  const toggleInvoiceAddress = (hasInvoice: boolean) => {
    setForm((prev) => ({ ...prev, hasInvoiceAddress: hasInvoice }));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Stammdaten</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              placeholder="Kundenname"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="branch">Branche <span className="text-red-500">*</span></Label>
            <Input
              id="branch"
              placeholder="Branche"
              value={form.branch}
              onChange={(e) => updateForm("branch", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail <span className="text-red-500">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="E-Mail-Adresse"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="avanti_email">Avanti E-Mail</Label>
            <Input
              id="avanti_email"
              type="email"
              placeholder="kundenname@inbox.avanti.cx"
              value={form.avanti_email}
              onChange={(e) => updateForm("avanti_email", e.target.value)}
            />
            <p className="text-xs text-gray-500">
              E-Mail-Adresse für eingehende Kundenanfragen (wird automatisch generiert)
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Adresse</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="street">Straße <span className="text-red-500">*</span></Label>
            <Input
              id="street"
              placeholder="Straße und Hausnummer"
              value={form.address.street}
              onChange={(e) => updateAddress("street", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="zip">Postleitzahl <span className="text-red-500">*</span></Label>
            <Input
              id="zip"
              placeholder="PLZ"
              value={form.address.zip}
              onChange={(e) => updateAddress("zip", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="city">Ort <span className="text-red-500">*</span></Label>
            <Input
              id="city"
              placeholder="Stadt"
              value={form.address.city}
              onChange={(e) => updateAddress("city", e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Rechnungsadresse</h3>
          <div className="flex items-center space-x-2">
            <Label htmlFor="invoice-toggle" className="text-sm">Abweichende Rechnungsadresse</Label>
            <Switch
              id="invoice-toggle"
              checked={form.hasInvoiceAddress}
              onCheckedChange={toggleInvoiceAddress}
            />
          </div>
        </div>
        
        {form.hasInvoiceAddress && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="invoice-street">Straße</Label>
              <Input
                id="invoice-street"
                placeholder="Straße und Hausnummer"
                value={form.invoiceAddress.street}
                onChange={(e) => updateInvoiceAddress("street", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice-zip">Postleitzahl</Label>
              <Input
                id="invoice-zip"
                placeholder="PLZ"
                value={form.invoiceAddress.zip}
                onChange={(e) => updateInvoiceAddress("zip", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice-city">Ort</Label>
              <Input
                id="invoice-city"
                placeholder="Stadt"
                value={form.invoiceAddress.city}
                onChange={(e) => updateInvoiceAddress("city", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerMasterDataStep;
