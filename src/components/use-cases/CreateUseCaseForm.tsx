
import React from "react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { USE_CASE_TYPES, useCaseTypeLabels, type UseCaseType } from "@/types/use-case";

type Customer = {
  id: string;
  name: string;
  industry: string | null;
  tools?: {
    task_management: string | null;
    knowledge_base: string | null;
    crm: string | null;
  };
};

interface CreateUseCaseFormProps {
  customers: Customer[];
  customerId: string;
  setCustomerId: (value: string) => void;
  type: UseCaseType | "";
  setType: React.Dispatch<React.SetStateAction<UseCaseType | "">>;
  onNext: () => void;
  isLoading?: boolean;
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
  isLoading = false,
}) => {
  const handleTypeChange = (value: string) => {
    if (value === "" || Object.values(USE_CASE_TYPES).includes(value as UseCaseType)) {
      setType(value as UseCaseType | "");
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <label className="block mb-2 font-medium">Kunde *</label>
        <Select value={customerId} onValueChange={setCustomerId} disabled={isLoading}>
          <SelectTrigger className="w-full">
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird geladen...
              </span>
            ) : (
              selectedCustomer?.name || "Bitte auswählen"
            )}
          </SelectTrigger>
          <SelectContent>
            {customers?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.industry ? `(${c.industry})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCustomer && (
        <div className="p-4 bg-muted rounded-xl text-sm">
          <h3 className="font-medium mb-2">Kundenprofil</h3>
          <ul className="space-y-1">
            <li><span className="font-medium">Branche:</span> {selectedCustomer.industry || "Nicht angegeben"}</li>
            {selectedCustomer.tools && (
              <>
                <li><span className="font-medium">Task-Tool:</span> {selectedCustomer.tools.task_management || "Nicht angegeben"}</li>
                <li><span className="font-medium">Wissensdatenbank:</span> {selectedCustomer.tools.knowledge_base || "Nicht angegeben"}</li>
                <li><span className="font-medium">CRM:</span> {selectedCustomer.tools.crm || "Nicht angegeben"}</li>
              </>
            )}
          </ul>
        </div>
      )}

      <div>
        <label className="block mb-2 font-medium">Use Case Typ *</label>
        <Select value={type} onValueChange={handleTypeChange} disabled={isLoading}>
          <SelectTrigger className="w-full">
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird geladen...
              </span>
            ) : (
              useCaseTypes.find((t) => t.value === type)?.label || "Bitte auswählen"
            )}
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

      {type && (
        <div className="p-4 bg-muted rounded-xl text-sm">
          <h3 className="font-medium mb-2">Use Case Beschreibung</h3>
          <p>
            {type === USE_CASE_TYPES.KNOWLEDGE_REQUEST && (
              "Eine reine Informationsanfrage, die mit Wissen aus der Wissensdatenbank beantwortet wird."
            )}
            {type === USE_CASE_TYPES.FORWARDING && (
              "Ein Anliegen, das an einen Spezialisten weitergeleitet werden muss."
            )}
            {type === USE_CASE_TYPES.DIRECT && (
              "Ein Anliegen, das direkt bearbeitet werden kann, z.B. durch Anlegen einer Aufgabe."
            )}
          </p>
        </div>
      )}

      <div>
        <Button 
          disabled={!customerId || !type || isLoading} 
          onClick={onNext}
          className="mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Wird geladen...
            </>
          ) : (
            "Weiter"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateUseCaseForm;
