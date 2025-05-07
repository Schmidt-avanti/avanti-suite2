
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Phone, RefreshCw, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';

type TwilioPhone = {
  id: string;
  phone_number: string;
  friendly_name: string;
  twilio_sid: string;
  status: string;
  created_at: string;
  customer: {
    id: string;
    name: string;
  };
};

interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  region: string;
  locality: string;
}

const TwilioPhoneNumbers: React.FC = () => {
  const { toast } = useToast();
  const [phoneNumbers, setPhoneNumbers] = useState<TwilioPhone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [phoneNumberToRelease, setPhoneNumberToRelease] = useState<TwilioPhone | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAvailableNumber, setSelectedAvailableNumber] = useState<string>("");
  const [friendlyName, setFriendlyName] = useState<string>("");
  const [areaCode, setAreaCode] = useState<string>("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Fetch phone numbers and customers
  useEffect(() => {
    fetchPhoneNumbers();
    fetchCustomers();
  }, []);

  const fetchPhoneNumbers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('twilio_phone_numbers')
        .select(`
          *,
          customer:customer_id (id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhoneNumbers(data || []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      toast({
        title: "Error",
        description: "Could not load phone numbers",
        variant: "destructive"
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

  const listAvailableNumbers = async () => {
    setIsActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-number-manager', {
        body: { 
          action: 'list', 
          country_code: 'DE',
          area_code: areaCode || undefined
        }
      });

      if (error) throw error;
      if (data?.success && data?.phone_numbers) {
        setAvailableNumbers(data.phone_numbers);
        setListDialogOpen(true);
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      console.error('Error listing phone numbers:', error);
      toast({
        title: "Error",
        description: "Failed to list available phone numbers",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const purchasePhoneNumber = async () => {
    if (!selectedCustomerId || !friendlyName) {
      toast({
        title: "Missing information",
        description: "Please select a customer and enter a name for the phone number",
        variant: "destructive"
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-number-manager', {
        body: {
          action: 'purchase',
          customer_id: selectedCustomerId,
          friendly_name: friendlyName,
          country_code: 'DE',
          area_code: areaCode || undefined
        }
      });

      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Success",
          description: "Phone number purchased successfully"
        });
        setCreateDialogOpen(false);
        fetchPhoneNumbers();
        setFriendlyName("");
        setAreaCode("");
        setSelectedCustomerId("");
      } else {
        throw new Error(data?.message || 'Failed to purchase phone number');
      }
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase phone number",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const assignPhoneNumber = async () => {
    if (!selectedCustomerId || !friendlyName || !selectedAvailableNumber) {
      toast({
        title: "Missing information",
        description: "Please fill out all fields",
        variant: "destructive"
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const selectedNumber = availableNumbers.find(n => n.phoneNumber === selectedAvailableNumber);
      if (!selectedNumber) throw new Error("Selected phone number not found");

      const { data, error } = await supabase.functions.invoke('twilio-number-manager', {
        body: {
          action: 'assign',
          customer_id: selectedCustomerId,
          friendly_name: friendlyName,
          phone_number: selectedNumber.phoneNumber,
          twilio_sid: selectedNumber.friendlyName // This is actually the SID in this context
        }
      });

      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Success",
          description: "Phone number assigned successfully"
        });
        setAssignDialogOpen(false);
        fetchPhoneNumbers();
        setFriendlyName("");
        setSelectedAvailableNumber("");
        setSelectedCustomerId("");
      } else {
        throw new Error(data?.message || 'Failed to assign phone number');
      }
    } catch (error) {
      console.error('Error assigning phone number:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign phone number",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const releasePhoneNumber = async () => {
    if (!phoneNumberToRelease) return;

    setIsActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-number-manager', {
        body: {
          action: 'release',
          twilio_sid: phoneNumberToRelease.twilio_sid
        }
      });

      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Success",
          description: "Phone number released successfully"
        });
        setReleaseDialogOpen(false);
        setPhoneNumberToRelease(null);
        fetchPhoneNumbers();
      } else {
        throw new Error(data?.message || 'Failed to release phone number');
      }
    } catch (error) {
      console.error('Error releasing phone number:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to release phone number",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-semibold">Twilio Phone Numbers</CardTitle>
            <CardDescription>
              Manage customer-specific phone numbers for your call center
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPhoneNumbers()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={listAvailableNumbers}
              disabled={isActionLoading}
            >
              <Phone className="h-4 w-4 mr-1" />
              List Available
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Purchase Number
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="w-full h-12" />
              ))}
            </div>
          ) : phoneNumbers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No phone numbers found. Purchase a new number to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneNumbers.map((phone) => (
                  <TableRow key={phone.id}>
                    <TableCell className="font-medium">{phone.phone_number}</TableCell>
                    <TableCell>{phone.friendly_name}</TableCell>
                    <TableCell>{phone.customer?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        phone.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {phone.status}
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(phone.created_at), 'dd.MM.yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPhoneNumberToRelease(phone);
                          setReleaseDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Phone Number Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase New Phone Number</DialogTitle>
            <DialogDescription>
              Purchase a new phone number and assign it to a customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="customer" className="text-sm font-medium">Customer</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="friendlyName" className="text-sm font-medium">Friendly Name</label>
              <Input
                id="friendlyName"
                placeholder="e.g., Customer Service Line"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="areaCode" className="text-sm font-medium">Area Code (Optional)</label>
              <Input
                id="areaCode"
                placeholder="e.g., 30 for Berlin"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to search across all area codes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={purchasePhoneNumber} 
              disabled={isActionLoading || !selectedCustomerId || !friendlyName}
            >
              {isActionLoading ? "Processing..." : "Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* List Available Numbers Dialog */}
      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Available Phone Numbers</DialogTitle>
            <DialogDescription>
              Select a number to assign to a customer
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Locality</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No available numbers found</TableCell>
                  </TableRow>
                ) : (
                  availableNumbers.map((num, index) => (
                    <TableRow key={index}>
                      <TableCell>{num.phoneNumber}</TableCell>
                      <TableCell>{num.region}</TableCell>
                      <TableCell>{num.locality}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAvailableNumber(num.phoneNumber);
                            setListDialogOpen(false);
                            setAssignDialogOpen(true);
                          }}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setListDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Phone Number Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Phone Number</DialogTitle>
            <DialogDescription>
              Assign the selected phone number to a customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input disabled value={selectedAvailableNumber} />
            </div>
            <div className="space-y-2">
              <label htmlFor="customer" className="text-sm font-medium">Customer</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="friendlyName" className="text-sm font-medium">Friendly Name</label>
              <Input
                id="friendlyName"
                placeholder="e.g., Customer Service Line"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={assignPhoneNumber} 
              disabled={isActionLoading || !selectedCustomerId || !friendlyName}
            >
              {isActionLoading ? "Processing..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Phone Number Dialog */}
      <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Phone Number</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release this phone number? This action cannot be undone.
            </AlertDialogDescription>
            {phoneNumberToRelease && (
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <p className="font-medium">{phoneNumberToRelease.phone_number}</p>
                <p className="text-sm text-muted-foreground">{phoneNumberToRelease.friendly_name}</p>
                <p className="text-sm text-muted-foreground">
                  Customer: {phoneNumberToRelease.customer?.name || 'None'}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={releasePhoneNumber}
              disabled={isActionLoading}
            >
              {isActionLoading ? "Releasing..." : "Release"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TwilioPhoneNumbers;
