import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePostalCodeLookup } from "@/hooks/usePostalCodeLookup";
// Korrigierter Import basierend auf Projektstruktur
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { FileIcon, Upload, X } from "lucide-react";
import { v4 as uuid } from "uuid";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from 'date-fns/locale';

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

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

interface CustomerFormData {
  name: string;
  street: string;
  zip: string; // Verwendet als zip in der UI
  city: string;
  country: string;
  addressAddition?: string;
  email: string;
  phone: string;
  industry: string;
  customIndustry?: string;
  branch?: string; // Legacy-Feld
  sameAsBilling: boolean;
  hasInvoiceAddress: boolean; // Für API-Interaktion
  invoiceStreet: string;
  invoiceZip: string; // Verwendet als invoiceZip in der UI
  invoiceCity: string;
  invoiceCountry: string;
  invoiceAddressAddition?: string;
  invoiceEmail: string;
  invoiceContactName?: string; // Kombinierter Name
  invoiceContact?: string;
  invoiceContactFirstName?: string;
  invoiceContactLastName?: string;
  billingEmail?: string; // Legacy-Feld
  billingAddress?: string; // Legacy-Feld
  product: string;
  options: string[];
  startDate: Date;
  billingInterval: 'monthly' | 'quarterly' | 'annually';
  contractType: 'inbound' | 'outbound';
  contractFile: File | null;
  offerFile: File | null;
  additionalFiles: File[];
  // Client-User Felder
  createClientUser?: boolean;
  clientUserFirstName?: string;
  clientUserLastName?: string;
  clientUserEmail?: string;
}

const CustomerFormDialog: React.FC<CustomerFormDialogProps> = ({
  open,
  onOpenChange,
  customer,
  setCustomers
}) => {
  const [step, setStep] = useState(0);
  const steps = [
    "Stammdaten",
    "Rechnungsdaten",
    "Vertrag",
    "Dokumente",
    "Benutzer"
  ];
  const [isInvoiceAddressEnabled, setIsInvoiceAddressEnabled] = useState(false);
  const [isCreatingClientUser, setIsCreatingClientUser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // PLZ-Lookup für Hauptadresse
  const {
    suggestions: mainAddressSuggestions,
    isLoading: mainAddressLoading,
    lookupPostalCode: lookupMainPostalCode
  } = usePostalCodeLookup();
  
  // PLZ-Lookup für Rechnungsadresse
  const {
    suggestions: invoiceAddressSuggestions,
    isLoading: invoiceAddressLoading,
    lookupPostalCode: lookupInvoicePostalCode
  } = usePostalCodeLookup();
  
  const mainAddressDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceAddressDropdownRef = useRef<HTMLDivElement>(null);
  
  const [showMainSuggestions, setShowMainSuggestions] = useState(false);
  const [showInvoiceSuggestions, setShowInvoiceSuggestions] = useState(false);

  const { toast } = useToast();

  const defaultValues: CustomerFormData = {
    name: '',
    street: '',
    zip: '',
    city: '',
    country: 'Deutschland',
    addressAddition: '',
    email: '',
    phone: '',
    industry: '', // Leeres Feld für "Bitte Branche wählen..."
    customIndustry: '',
    sameAsBilling: true,
    hasInvoiceAddress: false,
    invoiceStreet: '',
    invoiceZip: '',
    invoiceCity: '',
    invoiceCountry: 'Deutschland',
    invoiceAddressAddition: '',
    invoiceEmail: '',
    invoiceContact: '',
    invoiceContactFirstName: '',
    invoiceContactLastName: '',
    product: '',
    options: [],
    startDate: new Date(),
    billingInterval: 'monthly',
    contractType: 'inbound',
    contractFile: null,
    offerFile: null,
    additionalFiles: []
  };

  const formSchema = z.object({
    name: z.string().min(1, "Name ist erforderlich."),
    street: z.string().min(1, "Straße ist erforderlich."),
    zip: z.string().min(1, "PLZ ist erforderlich."),
    city: z.string().min(1, "Ort ist erforderlich."),
    country: z.string(),
    addressAddition: z.string().optional(),
    email: z.string().email("Ungültige E-Mail-Adresse."),
    phone: z.string(),
    industry: z.string().min(1, "Branche ist erforderlich."),
    customIndustry: z.string().optional(),
    hasInvoiceAddress: z.boolean(),
    invoiceStreet: z.string().optional(),
    invoiceZip: z.string().optional(),
    invoiceCity: z.string().optional(),
    invoiceCountry: z.string().optional(),
    invoiceAddressAddition: z.string().optional(),
    invoiceEmail: z.string().optional(),
    invoiceContact: z.string().optional(),
    invoiceContactFirstName: z.string().optional(),
    invoiceContactLastName: z.string().optional(),
    product: z.string().optional(),
    options: z.array(z.string()).optional(),
    startDate: z.date().optional(),
    billingInterval: z.enum(['monthly', 'quarterly', 'annually']).optional(),
    contractType: z.enum(['inbound', 'outbound']).optional(),
    contractFile: z.instanceof(File).optional().nullable(),
    offerFile: z.instanceof(File).optional().nullable(),
    additionalFiles: z.array(z.instanceof(File)).optional(),
    createClientUser: z.boolean().optional(),
    clientUserFirstName: z.string().optional(),
    clientUserLastName: z.string().optional(),
    clientUserEmail: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.createClientUser) {
      if (!data.clientUserFirstName || data.clientUserFirstName.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vorname ist erforderlich.",
          path: ["clientUserFirstName"],
        });
      }
      if (!data.clientUserLastName || data.clientUserLastName.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nachname ist erforderlich.",
          path: ["clientUserLastName"],
        });
      }
      if (!data.clientUserEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "E-Mail ist erforderlich.",
          path: ["clientUserEmail"],
        });
      } else {
        const emailValidation = z.string().email("Ungültige E-Mail-Adresse.").safeParse(data.clientUserEmail);
        if (!emailValidation.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: emailValidation.error.issues[0].message,
            path: ["clientUserEmail"],
          });
        }
      }
    }
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  const hasInvoiceAddress = form.watch("hasInvoiceAddress");
  const zip = form.watch("zip");
  const invoiceZip = form.watch("invoiceZip");
  const product = form.watch("product");
  const options = form.watch("options");
  const contractFile = form.watch("contractFile");
  const offerFile = form.watch("offerFile");
  const additionalFiles = form.watch("additionalFiles");
  const createClientUser = form.watch("createClientUser");

  useEffect(() => {
    if (open && customer) {
      form.reset({
        name: customer.name || "",
        street: customer.street || "",
        zip: customer.zip || "",
        city: customer.city || "",
        country: "DE", // Country is not in the model, default to DE
        addressAddition: customer.address_addition || "",
        email: customer.email || "",
        phone: "", // Phone is not in the model
        industry: customer.industry || "",
        hasInvoiceAddress: !!customer.has_invoice_address,
        invoiceStreet: customer.invoice_street || "",
        invoiceZip: customer.invoice_zip || "",
        invoiceCity: customer.invoice_city || "",
        invoiceAddressAddition: customer.invoice_address_addition || "",
        invoiceEmail: customer.invoice_email || "",
        invoiceContact: customer.invoice_contact_name || "",
        product: customer.products && customer.products.length > 0 ? customer.products[0] : undefined,
        options: customer.options || [],
        startDate: customer.start_date ? new Date(customer.start_date) : new Date(),
        billingInterval: customer.billing_interval || 'monthly',
        contractType: customer.contract_type || 'inbound',
        createClientUser: false,
        clientUserFirstName: '',
        clientUserLastName: '',
        clientUserEmail: '',
      });
      setIsInvoiceAddressEnabled(customer.has_invoice_address || false);
    } else if (open) {
      form.reset(defaultValues);
      setIsInvoiceAddressEnabled(false);
      setIsCreatingClientUser(false);
    }
  }, [open, customer, form.reset]);



  // PLZ-Lookup für Hauptadresse
  useEffect(() => {
    if (zip && zip.length >= 4) {
      lookupMainPostalCode(zip);
    }
  }, [zip]);
  
  // PLZ-Lookup für Rechnungsadresse
  useEffect(() => {
    if (invoiceZip && invoiceZip.length >= 4) {
      lookupInvoicePostalCode(invoiceZip);
    }
  }, [invoiceZip]);
  
  // Klick außerhalb der Dropdowns versteckt diese
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mainAddressDropdownRef.current && !mainAddressDropdownRef.current.contains(event.target as Node)) {
        setShowMainSuggestions(false);
      }
      if (invoiceAddressDropdownRef.current && !invoiceAddressDropdownRef.current.contains(event.target as Node)) {
        setShowInvoiceSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [products, setProducts] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        // Aktive Produkte laden
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (error) throw error;
        setProducts(data || []);
        
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    const fetchProductOptions = async () => {
      setLoadingOptions(true);
      try {
        // Aktive Produktoptionen laden
        const { data, error } = await supabase
          .from('product_options')
          .select(`
            id,
            name,
            product_id,
            is_active,
            product_option_versions!inner (description, price_monthly, price_once, version)
          `)

      if (error) throw error;
      
      // Transformiere die Daten in ein einfacheres Format für die UI
      if (data) {
        const formattedOptions = data.map((item: any) => {
          // Nimm die neueste Version (höchste Versionsnummer)
          const versions = item.product_option_versions;
          const latestVersion = versions.sort((a: any, b: any) => b.version - a.version)[0];
            
            return {
              id: item.id,
              name: item.name,
              product_id: item.product_id,
              description: latestVersion.description
            };
          });
          
          setProductOptions(formattedOptions);
        }
        
      } catch (error) {
        console.error('Error fetching product options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchProducts();
    fetchProductOptions();
  }, []);

  useEffect(() => {
    if (product && productOptions.length > 0) {
      // Wenn das Produkt wechselt, entferne Optionen, die nicht zum neuen Produkt passen
      const currentOptions = form.getValues('options') || [];
      const validOptions = productOptions
        .filter(option => option.product_id === product || option.product_id === null)
        .map(option => option.id);
      
      const newOptions = currentOptions.filter(optionId => 
        validOptions.includes(optionId)
      );
      
      form.setValue('options', newOptions);
    }
  }, [product, productOptions, form]);

  // Funktion zum Hochladen von Dateien in Supabase Storage
  const uploadDocumentToStorage = async (file: File, customerId: string, documentType: string) => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${customerId}/${documentType}-${Date.now()}.${fileExt}`;
    const filePath = `customer-documents/${fileName}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from('customer-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) throw uploadError;
    
    // Öffentliche URL generieren (oder sicheren Download-URL, je nach Anforderung)
    const { data: urlData } = supabase.storage
      .from('customer-documents')
      .getPublicUrl(filePath);
      
    return {
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: filePath,
      url: urlData.publicUrl,
      document_type: documentType
    };
  };
  
  // Hilfsfunktion zum Konvertieren von camelCase zu snake_case
  const toSnakeCase = (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  };

  // Hilfsfunktion zum Filtern und Konvertieren der Formulardaten für die Datenbank
  const prepareDataForDatabase = (formData: CustomerFormData) => {
    // Felder, die spezielle Behandlung benötigen oder nicht in der Datenbank gespeichert werden
    const specialFields = [
      'hasInvoiceAddress',
      'addressAddition',
      'invoiceAddressAddition',
      'invoiceContact',
      'invoiceContactFirstName',
      'invoiceContactLastName',
      'customIndustry',
      'billingInterval',
      'startDate',
      'contractType',
      'contractFile',
      'offerFile',
      'additionalFiles',
      'createClientUser',
      'clientUserFirstName',
      'clientUserLastName',
      'clientUserEmail',
      'phone' // Dieses Feld existiert nur im Formular, nicht in der Datenbank
    ];
    
    // Basisfelder aus dem Rest-Objekt übernehmen
    const dataForDb: Record<string, any> = {};
    
    // Alle regulären Felder durchgehen und zu snake_case konvertieren
    Object.keys(formData).forEach(key => {
      // Wenn nicht in specialFields, konvertiere zu snake_case
      if (!specialFields.includes(key)) {
        const snakeKey = toSnakeCase(key);
        dataForDb[snakeKey] = formData[key as keyof CustomerFormData];
      }
    });
    
    // Spezielle Felder manuell behandeln
    dataForDb['address_addition'] = formData.addressAddition;
    dataForDb['products'] = formData.product ? [formData.product] : [];
    dataForDb['has_invoice_address'] = formData.hasInvoiceAddress;
    
    // Rechnungsadressfelder nur setzen, wenn hasInvoiceAddress true ist
    if (formData.hasInvoiceAddress) {
      dataForDb['invoice_street'] = formData.invoiceStreet;
      dataForDb['invoice_address_addition'] = formData.invoiceAddressAddition;
      dataForDb['invoice_zip'] = formData.invoiceZip;
      dataForDb['invoice_city'] = formData.invoiceCity;
      dataForDb['invoice_country'] = formData.invoiceCountry;
      dataForDb['invoice_email'] = formData.invoiceEmail;
      
      // Rechnungskontaktname aus separaten Feldern zusammensetzen, falls vorhanden
      if (formData.invoiceContactFirstName && formData.invoiceContactLastName) {
        dataForDb['invoice_contact_name'] = `${formData.invoiceContactFirstName} ${formData.invoiceContactLastName}`.trim();
      } else {
        dataForDb['invoice_contact_name'] = formData.invoiceContact || null;
      }
    } else {
      // Wenn keine Rechnungsadresse, alle Rechnungsfelder auf null setzen
      dataForDb['invoice_street'] = null;
      dataForDb['invoice_address_addition'] = null;
      dataForDb['invoice_zip'] = null;
      dataForDb['invoice_city'] = null;
      dataForDb['invoice_country'] = null;
      dataForDb['invoice_email'] = null;
      dataForDb['invoice_contact_name'] = null;
    }
    
    // Explizites Mapping der Vertragsfelder
    dataForDb['billing_interval'] = formData.billingInterval;
    dataForDb['start_date'] = formData.startDate;
    dataForDb['contract_type'] = formData.contractType;
    
    return dataForDb;
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setIsSaving(true);
      
      // Daten für die Datenbank aufbereiten
      const customerData = prepareDataForDatabase(data);
      
      // Dateien für späteren Upload extrahieren
      const { contractFile, offerFile, additionalFiles } = data;
      const { createClientUser, clientUserFirstName, clientUserLastName, clientUserEmail } = data;

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
        
        // Formular zurücksetzen
        form.reset(defaultValues);
        setStep(0); // Zurück zum ersten Schritt
        setIsInvoiceAddressEnabled(false); // Zurücksetzen der Rechnungsadress-Option
        setIsCreatingClientUser(false); // Zurücksetzen der Client-User-Option
      }
      
      // Dokumente hochladen, falls vorhanden
      const uploadPromises = [];
      const documentMetadata = [];
      
      // Vertragsdokument
      if (contractFile) {
        const uploadPromise = uploadDocumentToStorage(contractFile, newCustomerId, 'contract')
          .then(metadata => {
            if (metadata) documentMetadata.push({
              ...metadata,
              customer_id: newCustomerId,
              created_at: new Date().toISOString()
            });
          });
        uploadPromises.push(uploadPromise);
      }
      
      // Angebotsdokument
      if (offerFile) {
        const uploadPromise = uploadDocumentToStorage(offerFile, newCustomerId, 'offer')
          .then(metadata => {
            if (metadata) documentMetadata.push({
              ...metadata,
              customer_id: newCustomerId,
              created_at: new Date().toISOString()
            });
          });
        uploadPromises.push(uploadPromise);
      }
      
      // Weitere Dokumente
      if (additionalFiles && additionalFiles.length > 0) {
        const additionalUploadPromises = additionalFiles.map((file, index) => {
          return uploadDocumentToStorage(file, newCustomerId, `additional-${index}`)
            .then(metadata => {
              if (metadata) documentMetadata.push({
                ...metadata,
                customer_id: newCustomerId,
                created_at: new Date().toISOString()
              });
            });
        });
        uploadPromises.push(...additionalUploadPromises);
      }
      
      // Alle Uploads abwarten
      if (uploadPromises.length > 0) {
        try {
          await Promise.all(uploadPromises);
          
          // Dokumenten-Metadaten speichern
          if (documentMetadata.length > 0) {
            const { error: docError } = await supabase
              .from('customer_documents')
              .insert(documentMetadata);
              
            if (docError) {
              console.error('Fehler beim Speichern der Dokument-Metadaten:', docError);
              toast({
                variant: "destructive",
                title: "Fehler bei Dokumenten",
                description: "Die Dokumente wurden hochgeladen, aber es gab einen Fehler beim Speichern der Metadaten."
              });
            } else {
              toast({
                title: "Dokumente gespeichert",
                description: `${documentMetadata.length} Dokumente wurden erfolgreich hochgeladen.`
              });
            }
          }
        } catch (uploadError) {
          console.error('Fehler beim Hochladen von Dokumenten:', uploadError);
          toast({
            variant: "destructive",
            title: "Fehler beim Hochladen",
            description: "Ein Fehler ist beim Hochladen der Dokumente aufgetreten."
          });
        }
      }

      // Optional: Client-User anlegen
      if (data.createClientUser && data.clientUserEmail && data.clientUserFirstName && data.clientUserLastName) {
        const newPassword = uuid().substring(0, 12); // Erstellt ein sicheres, zufälliges Passwort
        const { data: user, error: userError } = await supabase.auth.admin.createUser({
          email: data.clientUserEmail,
          password: newPassword,
          email_confirm: true, // User muss E-Mail bestätigen
          user_metadata: {
            firstName: data.clientUserFirstName,
            lastName: data.clientUserLastName,
            role: 'client',
            customer_id: newCustomerId
          }
        });

        if (userError) {
          throw new Error(`Fehler beim Erstellen des Client-Users: ${userError.message}`);
        }

        if (user) {
          // User-Customer-Zuordnung erstellen
          const { error: assignmentError } = await supabase
            .from('user_customer_assignments')
            .insert({ user_id: user.user.id, customer_id: newCustomerId });

          if (assignmentError) {
            throw new Error(`Fehler bei der Zuordnung des Users zum Kunden: ${assignmentError.message}`);
          }
        }
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Stepper-Header */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((s, idx) => (
              <div key={s} className={`flex-1 flex flex-col items-center ${idx === step ? 'font-bold text-avanti-700' : 'text-gray-400'}`}>
                <div className={`rounded-full w-8 h-8 flex items-center justify-center mb-1 border-2 ${idx === step ? 'border-avanti-700 bg-avanti-50' : 'border-gray-200 bg-white'}`}>{idx + 1}</div>
                <span className="text-xs text-center">{s}</span>
              </div>
            ))}
          </div>

          {/* Step Content */}
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stammdaten-Formular */}
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name des Kunden</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Straße</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                  control={form.control}
                  name="addressAddition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresszusatz (z.B. c/o)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PLZ</FormLabel>
                        <FormControl>
                          <Input {...field} onFocus={() => mainAddressSuggestions.length > 0 && setShowMainSuggestions(true)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <div ref={mainAddressDropdownRef} className="relative">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ort</FormLabel>
                        <FormControl>
                          <Input {...field} onFocus={() => mainAddressSuggestions.length > 0 && setShowMainSuggestions(true)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {showMainSuggestions && mainAddressSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                      {mainAddressLoading ? (
                        <p className="p-2 text-sm text-gray-500">Lädt...</p>
                      ) : (
                        <ul>
                          {mainAddressSuggestions.map((suggestion, index) => (
                            <li 
                              key={index} 
                              className="p-2 text-sm cursor-pointer hover:bg-gray-100"
                              onClick={() => {
                                form.setValue("city", suggestion.city);
                                setShowMainSuggestions(false);
                              }}
                            >
                              {suggestion.city}
                              {suggestion.state && <span className="text-gray-500 ml-1">({suggestion.state})</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branche *</FormLabel>
                      <FormControl>
                        <>
                          {/* State für andere Branche */}
                          <div className="relative">
                            <select
                              id="industry-select"
                              className="block w-full rounded-md border border-gray-300 p-2 mt-1 text-sm focus:ring focus:ring-avanti-200 bg-white text-black" /* Explizite Farben für Hintergrund und Text */
                              value={!field.value ? "" : presetBranches.includes(field.value) ? field.value : "__other__"}
                              onChange={(e) => {
                                if (e.target.value === "__other__") {
                                  // Markieren, dass eine andere Branche ausgewählt wurde
                                  form.setValue("customIndustry", "true"); // String statt Boolean
                                  // Lassen den bestehenden Wert, falls vorhanden
                                  if (!field.value) field.onChange("");
                                } else {
                                  form.setValue("customIndustry", ""); // Leerer String statt Boolean
                                  field.onChange(e.target.value);
                                }
                              }}
                            >
                              <option value="">Bitte Branche wählen…</option>
                              {presetBranches.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                              <option value="__other__">Andere Branche hinzufügen…</option>
                            </select>
                          </div>
                          
                          {/* Zeigen das Eingabefeld an, wenn "Andere Branche hinzufügen..." ausgewählt ist */}
                          {form.watch("customIndustry") === "true" && (
                            <Input
                              className="mt-2"
                              placeholder="Branche manuell eingeben"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value)}
                              autoFocus
                            />
                          )}
                        </>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              {/* Rechnungsdaten-Formular */}
              <div className="col-span-2 mb-2">
                <Label htmlFor="invoiceContactName">Ansprechpartner Rechnungen (optional)</Label>
                <Input id="invoiceContactName" {...form.register("invoiceContactName")} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="invoiceEmail">E-Mail für Rechnungen</Label>
                <Input 
                  id="invoiceEmail" 
                  type="email" 
                  {...form.register("invoiceEmail", { 
                    required: "E-Mail für Rechnungen ist erforderlich",
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: "Bitte geben Sie eine gültige E-Mail-Adresse ein"
                    }
                  })} 
                />
                {form.formState.errors.invoiceEmail && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.invoiceEmail.message}</p>
                )}
              </div>
              
              {/* Abweichende Rechnungsadresse */}
              <div className="col-span-2 mt-4 border-t pt-4">
                <div className="flex items-center mb-4">
                  <Checkbox 
                    id="hasInvoiceAddress" 
                    checked={hasInvoiceAddress} 
                    onCheckedChange={(checked) => form.setValue("hasInvoiceAddress", checked === true)}
                  />
                  <Label htmlFor="hasInvoiceAddress" className="ml-2 cursor-pointer">Abweichende Rechnungsadresse</Label>
                </div>
              </div>
              
              {hasInvoiceAddress && (
                <>
                  <div className="col-span-2">
                    <Label htmlFor="invoiceStreet">Straße (Rechnung)</Label>
                    <Input 
                      id="invoiceStreet" 
                      {...form.register("invoiceStreet", { 
                        required: hasInvoiceAddress ? "Straße für Rechnung ist erforderlich" : false 
                      })} 
                    />
                    {form.formState.errors.invoiceStreet && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.invoiceStreet.message}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="invoiceAddressAddition">Adresszusatz (z.B. c/o) für Rechnung</Label>
                    <Input id="invoiceAddressAddition" {...form.register("invoiceAddressAddition")} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="invoiceZip">PLZ (Rechnung)</Label>
                      <Input 
                        id="invoiceZip" 
                        {...form.register("invoiceZip", { 
                          required: hasInvoiceAddress ? "PLZ für Rechnung ist erforderlich" : false 
                        })}
                        onFocus={() => invoiceAddressSuggestions.length > 0 && setShowInvoiceSuggestions(true)}
                      />
                      {form.formState.errors.invoiceZip && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.invoiceZip.message}</p>
                      )}
                    </div>
                    <div ref={invoiceAddressDropdownRef} className="relative">
                      <Label htmlFor="invoiceCity">Ort (Rechnung)</Label>
                      <Input 
                        id="invoiceCity" 
                        {...form.register("invoiceCity", { 
                          required: hasInvoiceAddress ? "Ort für Rechnung ist erforderlich" : false 
                        })}
                        onFocus={() => invoiceAddressSuggestions.length > 0 && setShowInvoiceSuggestions(true)}
                      />
                      {form.formState.errors.invoiceCity && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.invoiceCity.message}</p>
                      )}
                      
                      {/* Dropdown für Ortsvorschläge */}
                      {showInvoiceSuggestions && invoiceAddressSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                          {invoiceAddressLoading ? (
                            <p className="p-2 text-sm text-gray-500">Lädt...</p>
                          ) : (
                            <ul>
                              {invoiceAddressSuggestions.map((suggestion, index) => (
                                <li 
                                  key={index} 
                                  className="p-2 text-sm cursor-pointer hover:bg-gray-100"
                                  onClick={() => {
                                    form.setValue("invoiceCity", suggestion.city);
                                    setShowInvoiceSuggestions(false);
                                  }}
                                >
                                  {suggestion.city}
                                  {suggestion.state && <span className="text-gray-500 ml-1">({suggestion.state})</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-lg font-semibold mb-4">Vertrag</div>
              {/* Vertrags-Formular */}
              <div>
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem className="w-full max-w-md">
                      <FormLabel>Produkt *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingProducts}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Bitte wählen..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingProducts ? (
                            <SelectItem value="loading" disabled>Lade Produkte...</SelectItem>
                          ) : (
                            products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.product_number})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {product && productOptions.length > 0 && (
                <div>
                  <Label className="font-semibold">Optionen</Label>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="options"
                      render={() => (
                        <>
                          {/* Filter options by selected product */}
                          {productOptions
                            .filter(option => option.product_id === product || option.product_id === null)
                            .map((option) => (
                              <FormField
                                key={option.id}
                                control={form.control}
                                name="options"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={option.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(option.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), option.id])
                                              : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== option.id
                                                )
                                              );
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {option.name}
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                        </>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Vertragsbeginn</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: de })
                              ) : (
                                <span>Datum wählen</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                            locale={de}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abrechnungsintervall</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Intervall wählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monatlich</SelectItem>
                          <SelectItem value="quarterly">Vierteljährlich</SelectItem>
                          <SelectItem value="annually">Jährlich</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vertragsart</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vertragsart wählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inbound">Inbound</SelectItem>
                          <SelectItem value="outbound">Outbound</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-lg font-medium">Schritt 4: Dokumente</h3>
              <p className="text-sm text-gray-500">
                Laden Sie hier relevante Dokumente hoch (Vertrag, Angebot, etc.). Erlaubte Formate sind PDF, DOC und DOCX (max. 5MB pro Datei).
              </p>
              
              {/* Vertragsupload */}
              <div className="space-y-2">
                <Label htmlFor="contractFile">Vertragsdokument</Label>
                <div 
                  className={`border-2 border-dashed rounded-md p-6 ${contractFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'} transition-colors flex flex-col items-center justify-center cursor-pointer`}
                  onClick={() => {
                    const input = document.getElementById('contractFile');
                    if (input) input.click();
                  }}
                >
                  <input
                    id="contractFile"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > 5 * 1024 * 1024) {
                        toast({
                          variant: "destructive",
                          title: "Datei zu groß",
                          description: "Die Datei ist zu groß (max. 5MB)"
                        });
                        e.target.value = '';
                        return;
                      }
                      form.setValue('contractFile', file);
                    }}
                  />
                  
                  {contractFile ? (
                    <div className="flex items-center gap-2 w-full">
                      <FileIcon className="h-6 w-6 text-blue-500" />
                      <span className="flex-1 truncate">{contractFile.name}</span>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          form.setValue('contractFile', null);
                          toast({
                            title: "Datei entfernt",
                            description: "Vertragsdokument wurde entfernt"
                          });
                        }}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Klicken Sie hier, um ein Vertragsdokument hochzuladen</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Angebotsupload */}
              <div className="space-y-2">
                <Label htmlFor="offerFile">Angebotsdokument</Label>
                <div 
                  className={`border-2 border-dashed rounded-md p-6 ${offerFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'} transition-colors flex flex-col items-center justify-center cursor-pointer`}
                  onClick={() => {
                    const input = document.getElementById('offerFile');
                    if (input) input.click();
                  }}
                >
                  <input
                    id="offerFile"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > 5 * 1024 * 1024) {
                        toast({
                          variant: "destructive",
                          title: "Datei zu groß",
                          description: "Die Datei ist zu groß (max. 5MB)"
                        });
                        e.target.value = '';
                        return;
                      }
                      form.setValue('offerFile', file);
                    }}
                  />
                  
                  {offerFile ? (
                    <div className="flex items-center gap-2 w-full">
                      <FileIcon className="h-6 w-6 text-blue-500" />
                      <span className="flex-1 truncate">{offerFile.name}</span>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          form.setValue('offerFile', null);
                          toast({
                            title: "Datei entfernt",
                            description: "Angebotsdokument wurde entfernt"
                          });
                        }}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Klicken Sie hier, um ein Angebotsdokument hochzuladen</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Weitere Dokumente Upload */}
              <div className="space-y-2">
                <Label htmlFor="additionalFiles">Weitere Dokumente</Label>
                <div 
                  className="border-2 border-dashed rounded-md p-6 border-gray-300 hover:border-gray-400 transition-colors flex flex-col items-center justify-center cursor-pointer"
                  onClick={() => {
                    const input = document.getElementById('additionalFiles');
                    if (input) input.click();
                  }}
                >
                  <input
                    id="additionalFiles"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      const validFiles = newFiles.filter(file => file.size <= 5 * 1024 * 1024);
                      
                      if (validFiles.length !== newFiles.length) {
                        toast({
                          variant: "destructive",
                          title: "Datei zu groß",
                          description: "Einige Dateien wurden ignoriert, da sie zu groß sind (max. 5MB)"
                        });
                      }
                      
                      const currentFiles = additionalFiles || [];
                      form.setValue('additionalFiles', [...currentFiles, ...validFiles]);
                      e.target.value = '';
                    }}
                  />
                  
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-500">Klicken Sie hier, um weitere Dokumente hochzuladen</span>
                  </div>
                </div>
                
                {/* Liste der hochgeladenen zusätzlichen Dokumente */}
                {additionalFiles?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-sm">Hochgeladene Dokumente:</h4>
                    <div className="space-y-2">
                      {additionalFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                          <FileIcon className="h-5 w-5 text-blue-500" />
                          <span className="flex-1 truncate text-sm">{file.name}</span>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              const files = [...additionalFiles];
                              files.splice(index, 1);
                              form.setValue('additionalFiles', files);
                              toast({
                                title: "Datei entfernt",
                                description: `${file.name} wurde entfernt`
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="createClientUser"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Client-User anlegen
                      </FormLabel>
                      <FormDescription>
                        Legt einen neuen Benutzer an, der auf diesen Kunden beschränkt ist.
                      </FormDescription>
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
              {createClientUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md animate-in fade-in-50">
                  <FormField
                    control={form.control}
                    name="clientUserFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname</FormLabel>
                        <FormControl>
                          <Input placeholder="Max" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientUserLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nachname</FormLabel>
                        <FormControl>
                          <Input placeholder="Mustermann" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="clientUserEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-Mail</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="max.mustermann@mail.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => {
              form.reset(defaultValues);
              setStep(0);
              onOpenChange(false);
            }} disabled={isSaving}>
              Abbrechen
            </Button>
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)} disabled={isSaving}>
                Zurück
              </Button>
            )}
            {step < steps.length - 1 && (
              <Button
                type="button"
                onClick={async () => {
                  let valid = true;
                  if (step === 0) {
                    valid = await form.trigger(["name", "industry", "street", "zip", "city", "email"]);
                  } else if (step === 1) {
                    // Für Schritt 2 (Rechnungsdaten)
                    valid = await form.trigger(["invoiceEmail"]);
                    
                    // Wenn abweichende Rechnungsadresse aktiviert ist, prüfe auch diese Felder
                    if (hasInvoiceAddress) {
                      const validationResult = await form.trigger(["invoiceStreet", "invoiceZip", "invoiceCity"]);
                      valid = valid && validationResult;
                    }
                  } else if (step === 2) {
                    // Für Schritt 3 (Vertrag)
                    valid = await form.trigger(["product", "startDate", "billingInterval", "contractType"]);
                  } else if (step === 3) {
                    // Schritt 4 (Dokumente) hat keine Pflichtfelder, also immer valide
                    valid = true;
                  } else if (step === 4) {
                    // Schritt 5 (User) validieren, falls die Option aktiv ist
                    if (createClientUser) {
                      valid = await form.trigger(["clientUserFirstName", "clientUserLastName", "clientUserEmail"]);
                    } else {
                      valid = true;
                    }
                  }
                  // Weitere Steps können hier ergänzt werden
                  if (valid) setStep(step + 1);
                }}
                disabled={isSaving}
              >
                Weiter
              </Button>
            )}
            {step === steps.length - 1 && (
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Speichert..." : customer ? "Speichern" : "Anlegen"}
              </Button>
            )}
          </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

};

export default CustomerFormDialog;
