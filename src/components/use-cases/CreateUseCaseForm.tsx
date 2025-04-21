
import React from "react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { USE_CASE_TYPES, useCaseTypeLabels, type UseCaseType } from "@/types/use-case";

type Customer = {
  id: string;
  name: string;
  industry: string | null;
};

interface CreateUseCaseFormProps {
  customers: Customer[];
  customerId: string;
  setCustomerId: (value: string) => void;
  type: UseCaseType | "";
  setType: React.Dispatch<React.SetStateAction<UseCaseType | "">>;
  onNext: () => void;
}

const useCaseTypes = Object.entries(useCaseTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

const CreateUseCaseForm: React.FC<CreateUseCaseFormProps> = ({
  customers,
  customerId,
  setCustomerId,
  type,
  setType,
  onNext,
}) => {
  const handleTypeChange = (value: string) => {
    if (value === "" || Object.values(USE_CASE_TYPES).includes(value as UseCaseType)) {
      setType(value as UseCaseType | "");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <label className="block mb-1 font-medium">Kunde</label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="w-full">
            {customers.find((c) => c.id === customerId)?.name || "Bitte auswählen"}
          </SelectTrigger>
          <SelectContent>
            {customers?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Typ</label>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full">
            {useCaseTypes.find((t) => t.value === type)?.label || "Bitte auswählen"}
          </SelectTrigger>
          <SelectContent>
            {useCaseTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button disabled={!customerId || !type} onClick={onNext}>
        Weiter
      </Button>
    </div>
  );
};

export default CreateUseCaseForm;
