
import React, { useEffect, useState } from "react";
import WhatsappAccountsTable, { CustomerMap } from "./whatsapp/WhatsappAccountsTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";

const WhatsappAccountsAdminPage: React.FC = () => {
  const [customerMap, setCustomerMap] = useState<CustomerMap>({});

  useEffect(() => {
    // Kunden-Mapping laden für Tabelle
    supabase
      .from("customers")
      .select("id, name")
      .then(({ data }) => {
        if (data) {
          const map: CustomerMap = {};
          data.forEach((c) => { map[c.id] = c.name; });
          setCustomerMap(map);
        }
      });
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 gap-4">
          <div className="flex gap-2 items-center">
            <MessageSquare className="text-green-600" />
            <CardTitle className="text-2xl font-semibold">WhatsApp Konten verwalten</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <WhatsappAccountsTable customerMap={customerMap} />
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsappAccountsAdminPage;
