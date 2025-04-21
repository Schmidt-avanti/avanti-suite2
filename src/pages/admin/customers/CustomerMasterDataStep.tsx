
import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Address {
  street: string;
  zip: string;
  city: string;
}
interface Props {
  form: {
    name: string;
    branch: string;
    email: string;
    address: Address;
    hasInvoiceAddress: boolean;
    invoiceAddress: Address;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

const CustomerMasterDataStep: React.FC<Props> = ({ form, setForm }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };
  const handleAddressChange = (field: keyof Address, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };
  const handleInvoiceAddressChange = (field: keyof Address, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      invoiceAddress: { ...prev.invoiceAddress, [field]: value }
    }));
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="font-medium">Kundenname *</label>
        <Input name="name" value={form.name} onChange={handleChange} required autoFocus />
      </div>
      <div>
        <label className="font-medium">Branche *</label>
        <Input name="branch" value={form.branch} onChange={handleChange} required />
      </div>
      <div>
        <label className="font-medium">E-Mail *</label>
        <Input type="email" name="email" value={form.email} onChange={handleChange} required />
      </div>
      <div>
        <label className="font-medium">Adresse *</label>
        <Input
          name="street"
          placeholder="Straße"
          value={form.address.street}
          onChange={e => handleAddressChange("street", e.target.value)}
          className="mb-2"
          required
        />
        <div className="flex gap-2">
          <Input
            name="zip"
            placeholder="PLZ"
            value={form.address.zip}
            onChange={e => handleAddressChange("zip", e.target.value)}
            required
          />
          <Input
            name="city"
            placeholder="Ort"
            value={form.address.city}
            onChange={e => handleAddressChange("city", e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 font-medium mb-1">
          <Switch
            checked={form.hasInvoiceAddress}
            onCheckedChange={checked => setForm((f: any) => ({ ...f, hasInvoiceAddress: checked }))}
          />
          Abweichende Rechnungsadresse?
        </label>
        {form.hasInvoiceAddress && (
          <div>
            <Input
              name="invoiceStreet"
              placeholder="Straße"
              value={form.invoiceAddress.street}
              onChange={e => handleInvoiceAddressChange("street", e.target.value)}
              className="mb-2"
              required
            />
            <div className="flex gap-2">
              <Input
                name="invoiceZip"
                placeholder="PLZ"
                value={form.invoiceAddress.zip}
                onChange={e => handleInvoiceAddressChange("zip", e.target.value)}
                required
              />
              <Input
                name="invoiceCity"
                placeholder="Ort"
                value={form.invoiceAddress.city}
                onChange={e => handleInvoiceAddressChange("city", e.target.value)}
                required
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerMasterDataStep;
