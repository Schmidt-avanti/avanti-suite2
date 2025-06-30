import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Alphabetisch sortierte Branchenliste für das Dropdown
const presetBranches = [
  "Baugewerbe",
  "Bildung",
  "e-commerce",
  "Gastronomie",
  "Gesundheitswesen",
  "Handel",
  "Handwerk",
  "Hausverwaltung",
  "IT & Software",
  "Logistik",
  "Marketing & Werbung",
  "Produktion & Industrie",
  "Transport & Verkehr",
  "Versicherung"
];

interface CustomerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

// Validierungsschema für die Bearbeitung eines Kunden
const customerEditSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  street: z.string().min(1, "Straße ist erforderlich"),
  zipCode: z.string().min(1, "PLZ ist erforderlich"),
  city: z.string().min(1, "Ort ist erforderlich"),
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  industry: z.string().min(1, "Branche ist erforderlich"),
  is_active: z.boolean(),
  products: z.string().nullable(),
  options: z.array(z.string()).nullable()
});

type CustomerEditFormData = z.infer<typeof customerEditSchema>;

export const CustomerEditDialog: React.FC<CustomerEditDialogProps> = ({
  open,
  onOpenChange,
  customer,
  setCustomers
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productMap, setProductMap] = useState<{[key: string]: string}>({});
  const [optionsMap, setOptionsMap] = useState<{[key: string]: string}>({});
  const [availableProducts, setAvailableProducts] = useState<{id: string, name: string}[]>([]);
  const [availableOptions, setAvailableOptions] = useState<{id: string, name: string}[]>([]);

  // Form definieren
  const form = useForm<CustomerEditFormData>({
    resolver: zodResolver(customerEditSchema),
    defaultValues: {
      name: "",
      street: "",
      zipCode: "",
      city: "",
      email: "",
      industry: "",
      is_active: true,
      products: null,
      options: []
    },
  });

  // Produkte und Optionen laden
  useEffect(() => {
    const fetchProductsAndOptions = async () => {
      // Produkte laden
      const { data: productData } = await supabase
        .from("products")
        .select("id, name");
        
      if (productData) {
        const prodMap: {[key: string]: string} = {};
        productData.forEach(product => {
          prodMap[product.id] = product.name;
        });
        setProductMap(prodMap);
        setAvailableProducts(productData);
      }
      
      // Optionen laden
      const { data: optionsData } = await supabase
        .from("product_options")
        .select("id, name");
        
      if (optionsData) {
        const optMap: {[key: string]: string} = {};
        optionsData.forEach(option => {
          optMap[option.id] = option.name;
        });
        setOptionsMap(optMap);
        setAvailableOptions(optionsData);
      }
    };

    if (open) {
      fetchProductsAndOptions();
    }
  }, [open]);

  // Wenn sich der Kunde ändert, Formularfelder aktualisieren
  useEffect(() => {
    if (customer) {
      form.setValue("name", customer.name || "");
      form.setValue("street", customer.street || "");
      form.setValue("zipCode", customer.zip || "");
      form.setValue("city", customer.city || "");
      form.setValue("email", customer.email || "");
      form.setValue("industry", customer.industry || "");
      form.setValue("is_active", customer.is_active === true);
      
      if (Array.isArray(customer.products) && customer.products.length > 0) {
        form.setValue("products", customer.products[0]);
      } else {
        form.setValue("products", null);
      }
      
      if (Array.isArray(customer.options)) {
        form.setValue("options", customer.options);
      } else {
        form.setValue("options", []);
      }
    }
  }, [customer, form]);

  // Kundenobjekt für die Datenbank umwandeln (camelCase -> snake_case)
  const mapFormToDbFields = (formData: CustomerEditFormData) => {
    const productArray = formData.products ? [formData.products] : [];

    return {
      name: formData.name,
      street: formData.street,
      zip: formData.zipCode,
      city: formData.city,
      email: formData.email,
      industry: formData.industry,
      is_active: formData.is_active,
      products: productArray,
      options: formData.options || [],
      updated_at: new Date().toISOString()
    };
  };

  // Formular absenden
  const onSubmit = async (formData: CustomerEditFormData) => {
    if (!customer) return;
    
    setIsSubmitting(true);
    
    try {
      const mappedData = mapFormToDbFields(formData);
      
      // Daten in Datenbank aktualisieren
      const { error } = await supabase
        .from("customers")
        .update(mappedData)
        .eq("id", customer.id);
        
      if (error) {
        toast.error("Fehler beim Speichern der Änderungen");
        console.error("Fehler beim Speichern:", error);
        return;
      }
      
      // Liste der Kunden aktualisieren
      setCustomers((prevCustomers) => 
        prevCustomers.map((c) => 
          c.id === customer.id ? { ...c, ...mappedData } : c
        )
      );
      
      toast.success("Kundendaten erfolgreich aktualisiert");
      onOpenChange(false);
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Kunde bearbeiten: {customer?.name}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Stammdaten */}
              <div className="col-span-2">
                <h3 className="text-lg font-medium">Stammdaten</h3>
              </div>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Firmenname" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Straße und Hausnummer</FormLabel>
                    <FormControl>
                      <Input placeholder="Straße und Hausnummer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PLZ</FormLabel>
                    <FormControl>
                      <Input placeholder="PLZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ort</FormLabel>
                    <FormControl>
                      <Input placeholder="Ort" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>E-Mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="mail@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Branche</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Bitte Branche wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presetBranches.map((branch) => (
                          <SelectItem key={branch} value={branch}>
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Vertragsdetails */}
              <div className="col-span-2 mt-4">
                <h3 className="text-lg font-medium">Vertragsdetails</h3>
              </div>
              
              <FormField
                control={form.control}
                name="products"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Produkt</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Bitte Produkt wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="col-span-2">
                <FormLabel>Optionen</FormLabel>
                <div className="grid grid-cols-2 gap-4 border rounded-md p-4">
                  {availableOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <input 
                        type="checkbox"
                        id={`option-${option.id}`}
                        checked={form.watch("options")?.includes(option.id)}
                        onChange={(e) => {
                          const currentOptions = form.watch("options") || [];
                          if (e.target.checked) {
                            form.setValue("options", [...currentOptions, option.id]);
                          } else {
                            form.setValue(
                              "options",
                              currentOptions.filter((id) => id !== option.id)
                            );
                          }
                        }}
                      />
                      <label htmlFor={`option-${option.id}`}>{option.name}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Status */}
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Kunde aktiv oder inaktiv setzen
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Wird gespeichert..." : "Änderungen speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerEditDialog;
