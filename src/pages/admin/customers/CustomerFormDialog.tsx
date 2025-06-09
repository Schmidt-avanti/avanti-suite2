
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Customer } from "@/types";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerContactsStep from "./CustomerContactsStep";
import CustomerToolsStep from "./CustomerToolsStep";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

interface CustomerFormData {
  name: string;
  street: string;
  zip: string;
  city: string;
  email: string;
  industry: string;
  branch: string;
  hasInvoiceAddress: boolean;
  invoiceStreet: string;
  invoiceZip: string;
  invoiceCity: string;
  billingEmail: string;
  billingAddress: string;
  costCenter: string;
  contactPerson: string;
  // Always create client user - field kept for backward compatibility
  createClientUser: boolean;
  clientEmail: string;
  clientName: string;
  clientPassword: string; // Added for custom initial password
}

const CustomerFormDialog: React.FC<CustomerFormDialogProps> = ({
  open,
  onOpenChange,
  customer,
  setCustomers
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [isInvoiceAddressEnabled, setIsInvoiceAddressEnabled] = useState(false);
  const [isCreatingClientUser, setIsCreatingClientUser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: {
      hasInvoiceAddress: false,
      createClientUser: true, // Always true now
      clientEmail: "",
      clientName: "",
      clientPassword: "W1llkommen@avanti"  // Default password
    }
  });

  // Watch if the checkbox is checked
  const hasInvoiceAddress = watch("hasInvoiceAddress");
  const createClientUser = watch("createClientUser");

  // Set the customer data when the dialog opens
  useEffect(() => {
    if (open && customer) {
      reset({
        name: customer.name || "",
        street: customer.street || "",
        zip: customer.zip || "",
        city: customer.city || "",
        email: customer.email || "",
        industry: customer.industry || "",
        branch: customer.branch || "",
        hasInvoiceAddress: customer.has_invoice_address || false,
        invoiceStreet: customer.invoice_street || "",
        invoiceZip: customer.invoice_zip || "",
        invoiceCity: customer.invoice_city || "",
        billingEmail: customer.billing_email || "",
        billingAddress: customer.billing_address || "",
        costCenter: customer.cost_center || "",
        contactPerson: customer.contact_person || "",
        // Don't automatically check createClientUser for existing customers
        createClientUser: false, 
        clientEmail: customer.email || "",
        clientName: customer.name || "",
        clientPassword: "W1llkommen@avanti" // Default password
      });
      setIsInvoiceAddressEnabled(customer.has_invoice_address || false);
    } else if (open) {
      // Reset form when opening for a new customer
      reset({
        name: "",
        street: "",
        zip: "",
        city: "",
        email: "",
        industry: "",
        branch: "",
        hasInvoiceAddress: false,
        invoiceStreet: "",
        invoiceZip: "",
        invoiceCity: "",
        billingEmail: "",
        billingAddress: "",
        costCenter: "",
        contactPerson: "",
        createClientUser: true, // Always true now
        clientEmail: "",
        clientName: "",
        clientPassword: "W1llkommen@avanti" // Default password
      });
      setIsInvoiceAddressEnabled(false);
      setIsCreatingClientUser(false);
    }
  }, [open, customer, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setIsSaving(true);
      
      // Format the data for the database
      const customerData = {
        name: data.name,
        street: data.street,
        zip: data.zip,
        city: data.city,
        email: data.email,
        industry: data.industry,
        branch: data.branch,
        has_invoice_address: data.hasInvoiceAddress,
        invoice_street: data.hasInvoiceAddress ? data.invoiceStreet : null,
        invoice_zip: data.hasInvoiceAddress ? data.invoiceZip : null,
        invoice_city: data.hasInvoiceAddress ? data.invoiceCity : null,
        billing_email: data.billingEmail,
        billing_address: data.billingAddress,
        cost_center: data.costCenter,
        contact_person: data.contactPerson,
        avanti_email: null // This will be filled in by a trigger
      };

      let newCustomerId: string;

      if (customer) {
        // Update existing customer
        const { data: updatedCustomer, error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", customer.id)
          .select()
          .single();

        if (error) throw error;
        
        setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
        newCustomerId = customer.id;
        
        toast({
          title: "Kunde aktualisiert",
          description: `${data.name} wurde erfolgreich aktualisiert.`
        });
      } else {
        // Create new customer
        const { data: newCustomer, error } = await supabase
          .from("customers")
          .insert(customerData)
          .select()
          .single();

        if (error) throw error;
        
        setCustomers(prev => [...prev, newCustomer]);
        newCustomerId = newCustomer.id;
        
        toast({
          title: "Kunde angelegt",
          description: `${data.name} wurde erfolgreich angelegt.`
        });
      }

      // Create client user if requested or if it's a new customer
      if ((data.createClientUser || !customer) && data.clientEmail) {
        try {
          const { data: userData, error } = await supabase.functions.invoke('create-user', {
            body: {
              action: 'create',
              email: data.clientEmail,
              password: data.clientPassword || "W1llkommen@avanti", // Use the provided password or default
              userData: {
                role: "client",
                "Full Name": data.clientName || data.name,
                needs_password_reset: true,
                is_active: true
              }
            }
          });

          if (error) {
            console.error("Error creating client user:", error);
            throw error;
          }

          if (userData?.userId) {
            // Associate the new user with this customer
            const { error: assignmentError } = await supabase
              .from('user_customer_assignments')
              .insert({
                user_id: userData.userId,
                customer_id: newCustomerId
              });

            if (assignmentError) {
              console.error("Error assigning user to customer:", assignmentError);
              throw assignmentError;
            }

            toast({
              title: "Kundenzugang erstellt",
              description: `Ein Benutzerkonto für ${data.clientEmail} wurde angelegt und mit ${data.name} verknüpft.`
            });
          }
        } catch (userError: any) {
          toast({
            variant: "destructive",
            title: "Fehler beim Anlegen des Benutzers",
            description: userError.message || "Der Kunde wurde gespeichert, aber der Benutzer konnte nicht angelegt werden."
          });
          // Continue execution, don't throw, as the customer was saved successfully
        }
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Fehler beim Speichern des Kunden"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[725px]">
        <DialogHeader>
          <DialogTitle>{customer ? `Kunde bearbeiten: ${customer.name}` : "Neuen Kunden anlegen"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Stammdaten</TabsTrigger>
              <TabsTrigger value="access">Zugang</TabsTrigger>
              <TabsTrigger value="billing">Abrechnung</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name des Kunden</Label>
                  <Input
                    id="name"
                    {...register("name", { required: "Name ist erforderlich" })}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="street">Straße</Label>
                  <Input
                    id="street"
                    {...register("street")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="zip">PLZ</Label>
                    <Input
                      id="zip"
                      {...register("zip")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ort</Label>
                    <Input
                      id="city"
                      {...register("city")}
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Branche</Label>
                  <Input
                    id="industry"
                    {...register("industry")}
                  />
                </div>

                <div>
                  <Label htmlFor="branch">Abteilung</Label>
                  <Input
                    id="branch"
                    {...register("branch")}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="access" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-sm text-blue-700 mb-4">
                  <p><strong>Wichtig:</strong> Für jeden neuen Kunden wird automatisch ein Kundenzugang angelegt.</p>
                  <p>Für bestehende Kunden können Sie optional einen Zugang erstellen.</p>
                </div>
                
                {!customer && (
                  <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800">
                    <strong>Hinweis:</strong> Da Sie einen neuen Kunden anlegen, wird automatisch ein Kundenzugang erstellt.
                  </div>
                )}
                
                {customer && (
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="createClientUser"
                      checked={createClientUser}
                      onCheckedChange={(checked) => {
                        setValue("createClientUser", checked === true);
                        setIsCreatingClientUser(checked === true);
                      }}
                    />
                    <Label htmlFor="createClientUser">Kundenzugang anlegen</Label>
                  </div>
                )}

                {(createClientUser || !customer) && (
                  <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                    <div>
                      <Label htmlFor="clientEmail">E-Mail für Zugang <span className="text-red-500">*</span></Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        {...register("clientEmail", {
                          required: !customer || createClientUser ? "E-Mail ist erforderlich für einen Kundenzugang" : false,
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Ungültige E-Mail-Adresse"
                          }
                        })}
                      />
                      {errors.clientEmail && (
                        <p className="text-sm text-red-500 mt-1">{errors.clientEmail.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="clientName">Name des Nutzers <span className="text-red-500">*</span></Label>
                      <Input
                        id="clientName"
                        {...register("clientName", {
                          required: !customer || createClientUser ? "Name ist erforderlich für einen Kundenzugang" : false
                        })}
                      />
                      {errors.clientName && (
                        <p className="text-sm text-red-500 mt-1">{errors.clientName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="clientPassword">Passwort <span className="text-red-500">*</span></Label>
                      <Input
                        id="clientPassword"
                        type="password"
                        {...register("clientPassword", {
                          required: !customer || createClientUser ? "Passwort ist erforderlich für einen Kundenzugang" : false,
                          minLength: {
                            value: 8,
                            message: "Passwort muss mindestens 8 Zeichen lang sein"
                          }
                        })}
                      />
                      {errors.clientPassword && (
                        <p className="text-sm text-red-500 mt-1">{errors.clientPassword.message}</p>
                      )}
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-sm text-blue-700">
                      <p>Ein Kundenzugang mit der angegebenen E-Mail wird angelegt. Der Kunde erhält ein temporäres Passwort und kann sich damit anmelden.</p>
                      <p className="mt-2">Initiales Passwort: <strong>{watch('clientPassword') || 'W1llkommen@avanti'}</strong> (Muss bei erster Anmeldung geändert werden)</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4 pt-4">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="hasInvoiceAddress"
                      checked={hasInvoiceAddress}
                      onCheckedChange={(checked) => {
                        setValue("hasInvoiceAddress", checked === true);
                        setIsInvoiceAddressEnabled(checked === true);
                      }}
                    />
                    <Label htmlFor="hasInvoiceAddress">Abweichende Rechnungsadresse</Label>
                  </div>

                  {hasInvoiceAddress && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                      <div>
                        <Label htmlFor="invoiceStreet">Straße (Rechnung)</Label>
                        <Input
                          id="invoiceStreet"
                          {...register("invoiceStreet", {
                            required: hasInvoiceAddress ? "Straße ist erforderlich" : false
                          })}
                        />
                        {errors.invoiceStreet && (
                          <p className="text-sm text-red-500 mt-1">{errors.invoiceStreet.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="invoiceZip">PLZ (Rechnung)</Label>
                          <Input
                            id="invoiceZip"
                            {...register("invoiceZip", {
                              required: hasInvoiceAddress ? "PLZ ist erforderlich" : false
                            })}
                          />
                          {errors.invoiceZip && (
                            <p className="text-sm text-red-500 mt-1">{errors.invoiceZip.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="invoiceCity">Ort (Rechnung)</Label>
                          <Input
                            id="invoiceCity"
                            {...register("invoiceCity", {
                              required: hasInvoiceAddress ? "Ort ist erforderlich" : false
                            })}
                          />
                          {errors.invoiceCity && (
                            <p className="text-sm text-red-500 mt-1">{errors.invoiceCity.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="billingEmail">Rechnungsemail</Label>
                  <Input
                    id="billingEmail"
                    type="email"
                    {...register("billingEmail")}
                  />
                </div>

                <div>
                  <Label htmlFor="billingAddress">Rechnungsanschrift</Label>
                  <Input
                    id="billingAddress"
                    {...register("billingAddress")}
                  />
                </div>

                <div>
                  <Label htmlFor="costCenter">Kostenstelle</Label>
                  <Input
                    id="costCenter"
                    {...register("costCenter")}
                  />
                </div>

                <div>
                  <Label htmlFor="contactPerson">Ansprechpartner</Label>
                  <Input
                    id="contactPerson"
                    {...register("contactPerson")}
                  />
                </div>
              </div>
            </TabsContent>

          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Speichert..." : customer ? "Speichern" : "Anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerFormDialog;
