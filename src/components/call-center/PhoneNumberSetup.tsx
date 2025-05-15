
// src/components/call-center/PhoneNumberSetup.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircleIcon, CheckCircleIcon, PhoneIcon, PlusIcon, RefreshCwIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string;
  customer_id: string;
  twilio_sid: string;
  customer?: {
    name: string;
  };
}

interface Customer {
  id: string;
  name: string;
}

const PhoneNumberSetup: React.FC = () => {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [newNumber, setNewNumber] = useState({
    phone_number: '',
    friendly_name: '',
    customer_id: '',
    twilio_sid: ''
  });
  
  // Fetch phone numbers and customers when component loads
  useEffect(() => {
    fetchPhoneNumbers();
    fetchCustomers();
  }, []);
  
  const fetchPhoneNumbers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('twilio_phone_numbers')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPhoneNumbers(data || []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load phone numbers',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
        
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form
      if (!newNumber.phone_number || !newNumber.friendly_name || !newNumber.customer_id) {
        toast({
          title: 'Validation Error',
          description: 'Please fill out all required fields',
          variant: 'destructive'
        });
        return;
      }
      
      // Format phone number to E.164 format if not already
      let formattedNumber = newNumber.phone_number;
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber.replace(/[^0-9]/g, '');
      }
      
      const { data, error } = await supabase
        .from('twilio_phone_numbers')
        .insert({
          ...newNumber,
          phone_number: formattedNumber
        })
        .select();
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Phone number added successfully'
      });
      
      setIsDialogOpen(false);
      fetchPhoneNumbers();
      setNewNumber({
        phone_number: '',
        friendly_name: '',
        customer_id: '',
        twilio_sid: ''
      });
    } catch (error) {
      console.error('Error adding phone number:', error);
      toast({
        title: 'Error',
        description: 'Failed to add phone number',
        variant: 'destructive'
      });
    }
  };
  
  const generateWebhookUrl = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://knoevkvjyuchhcmzsdpq.supabase.co';
    return `${supabaseUrl}/functions/v1/twilio-voice-webhook`;
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Telefonnummern-Konfiguration</CardTitle>
            <CardDescription>Verwaltung von Twilio-Telefonnummern</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPhoneNumbers}
              disabled={isLoading}
            >
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nummer hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neue Telefonnummer hinzufügen</DialogTitle>
                  <DialogDescription>
                    Fügen Sie eine neue Telefonnummer für einen Kunden hinzu
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Telefonnummer (E.164-Format)</Label>
                      <Input 
                        id="phone_number" 
                        placeholder="+4930123456789" 
                        value={newNumber.phone_number}
                        onChange={(e) => setNewNumber({...newNumber, phone_number: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="friendly_name">Anzeigename</Label>
                      <Input 
                        id="friendly_name" 
                        placeholder="Hauptnummer Kundenservice" 
                        value={newNumber.friendly_name}
                        onChange={(e) => setNewNumber({...newNumber, friendly_name: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="customer">Kunde</Label>
                      <Select 
                        value={newNumber.customer_id} 
                        onValueChange={(value) => setNewNumber({...newNumber, customer_id: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wählen Sie einen Kunden" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="twilio_sid">Twilio SID (optional)</Label>
                      <Input 
                        id="twilio_sid" 
                        placeholder="PN123456789abcdef..." 
                        value={newNumber.twilio_sid}
                        onChange={(e) => setNewNumber({...newNumber, twilio_sid: e.target.value})}
                      />
                      <p className="text-xs text-gray-500">
                        Die SID der Telefonnummer in Ihrem Twilio-Konto.
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit">Speichern</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {phoneNumbers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nummer</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Kunde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phoneNumbers.map((number) => (
                <TableRow key={number.id}>
                  <TableCell className="font-mono">{number.phone_number}</TableCell>
                  <TableCell>{number.friendly_name}</TableCell>
                  <TableCell>{number.customer?.name || 'Nicht zugewiesen'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-4 text-center text-gray-500">
            {isLoading ? 'Lade Telefonnummern...' : 'Keine Telefonnummern konfiguriert'}
          </div>
        )}
        
        <Alert className="mt-4">
          <PhoneIcon className="h-4 w-4" />
          <AlertTitle>Twilio-Konfiguration</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Konfigurieren Sie Ihre Twilio-Telefonnummern mit diesem Webhook:</p>
            <div className="bg-gray-100 p-2 rounded font-mono text-xs overflow-auto">
              {generateWebhookUrl()}
            </div>
            <p className="text-xs mt-1">
              Gehen Sie in Ihr Twilio-Dashboard, wählen Sie die Telefonnummer und setzen Sie diese URL als Voice Webhook.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default PhoneNumberSetup;
