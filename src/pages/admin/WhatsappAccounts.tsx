
import React, { useEffect, useState } from "react";
import WhatsappAccountsTable, { CustomerMap } from "./whatsapp/WhatsappAccountsTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Link2 } from "lucide-react";
import AssignWhatsappAccountDialog from "./whatsapp/AssignWhatsappAccountDialog";
import { Button } from "@/components/ui/button";

const WhatsappAccountsAdminPage: React.FC = () => {
  const [customerMap, setCustomerMap] = useState<CustomerMap>({});
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Kunden-Mapping laden für Tabelle
  useEffect(() => {
    supabase
      .from("customers")
      .select("id, name")
      .then(({ data }) => {
        if (data) {
          const map: CustomerMap = {};
          data.forEach((c) => { map[c.id] = c.name; });
          setCustomerMap(map);
          setCustomers(data);
        }
      });
  }, []);

  // Refreshe Tabelle nach Zuweisung
  const handleRefresh = () => {
    setRefreshFlag((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 gap-4">
          <div className="flex gap-2 items-center">
            <MessageSquare className="text-green-600" />
            <CardTitle className="text-2xl font-semibold">WhatsApp Konten verwalten</CardTitle>
          </div>
          <Button 
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setAssignDialogOpen(true)}
          >
            <Link2 className="h-4 w-4" />
            Konto zuweisen
          </Button>
        </CardHeader>
        <CardContent>
          <WhatsappAccountsTable customerMap={customerMap} refreshFlag={refreshFlag} />
        </CardContent>
      </Card>
      <AssignWhatsappAccountDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        customers={customers}
        refreshAccounts={handleRefresh}
      />
    </div>
  );
};

export default WhatsappAccountsAdminPage;
