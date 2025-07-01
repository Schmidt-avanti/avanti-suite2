
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (userId: string, note: string) => void;
  currentAssignee?: string;
  isForwarding?: boolean;
  customerId?: string;
}

// Create an interface that matches the actual shape of data from the database
interface ProfileWithRole {
  id: string;
  "Full Name": string;
  role: string;
  // Kundenzuordnungen werden separat abgefragt
  customer_ids?: string[];
}

// Interface for the users state which matches what we're actually storing
interface UserDisplay {
  id: string;
  fullName: string;
  role: string;
  email?: string;
  createdAt?: string;
}

export function AssignTaskDialog({ 
  open, 
  onOpenChange, 
  onAssign, 
  currentAssignee, 
  isForwarding = false,
  customerId
}: AssignTaskDialogProps) {
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [note, setNote] = useState("");

  // Ausführen von fetchUsers, wenn der Dialog geöffnet wird oder isForwarding sich ändert
  useEffect(() => {
    if (open) {
      console.log('Dialog geöffnet/aktualisiert. isForwarding:', isForwarding, 'customerId:', customerId);
      // Wichtig: Setze users auf leer, um alte Ergebnisse zu löschen
      setUsers([]);
      fetchUsers();
      
      // Debug-Timing: Wenn nach 1 Sekunde keine Benutzer geladen wurden, erneut versuchen
      const timer = setTimeout(() => {
        if (users.length === 0) {
          console.log('Keine Benutzer nach 1 Sekunde, versuche erneut zu laden');
          fetchUsers();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      // Reset form when closing
      setSelectedUser("");
      setNote("");
      // Wichtig: Setze users auf leer beim Schließen
      setUsers([]);
    }
  }, [open, isForwarding, customerId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log("Starte Benutzerabfrage. isForwarding:", isForwarding, "customerId:", customerId);

      // Abfrage für alle aktiven Benutzer mit Admin- oder Agent-Rolle
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, \"Full Name\", role")
        .eq("is_active", true)
        .in("role", ["admin", "agent"]);

      if (error) {
        console.error("Fehler bei Benutzerabfrage:", error);
        throw error;
      }

      console.log("Verfügbare Benutzer:", profiles?.length || 0);
      
      // Keine Daten zurückgekommen?
      if (!profiles || profiles.length === 0) {
        console.warn("Keine Benutzer gefunden!");
        setUsers([]);
        return;
      }

      // Kopieren der Profile-Daten
      let filteredUsers = [...profiles] as ProfileWithRole[];

      // Wenn wir eine Kunden-ID haben, filtern wir nach Kundenzuordnung
      // Dies gilt sowohl für normales Zuweisen als auch für Weiterleiten
      if (customerId) {
        // Hole die Benutzer-Kunden-Zuordnungen
        const { data: assignments, error: assignError } = await supabase
          .from("user_customer_assignments")
          .select("*")
          .eq("customer_id", customerId);

        if (assignError) {
          console.error("Fehler beim Abrufen der Benutzer-Kunden-Zuordnungen:", assignError);
        } else if (assignments && assignments.length > 0) {
          console.log("Benutzer-Kunden-Zuordnungen gefunden:", assignments.length);
          
          // Extrahiere alle Benutzer-IDs mit diesem Kunden
          const userIdsWithCustomer = assignments.map(a => a.user_id);
          console.log("Benutzer-IDs mit diesem Kunden:", userIdsWithCustomer);
          
          // Filtere die Benutzer basierend auf Rolle und Kundenzuordnung
          filteredUsers = filteredUsers.filter(user => {
            // Admins immer einschließen
            if (user.role === 'admin') {
              console.log(`Admin gefunden: ${user["Full Name"]}`); 
              return true;
            }
            
            // Nicht-Admins nur einschließen, wenn sie dem Kunden zugeordnet sind
            const isAssigned = userIdsWithCustomer.includes(user.id);
            console.log(`Benutzer ${user["Full Name"]} für Kunden zugeordnet: ${isAssigned}`);
            return isAssigned;
          });
        }
      } else {
        console.log("Keine Kunden-ID vorhanden. Zeige nur Admins an.");
        // Wenn keine Kunden-ID vorhanden ist, nur Admins anzeigen
        filteredUsers = filteredUsers.filter(user => user.role === 'admin');
      }
      
      console.log("Anzuzeigende Benutzer:", filteredUsers.length);

      // Debugging-Ausgabe der gefundenen Benutzer
      filteredUsers.forEach(user => {
        console.log(`Benutzer gefunden: ${user["Full Name"]} (${user.role})`);
      });

      // Transform the data to match the UserDisplay interface
      setUsers(
        filteredUsers.map(user => ({
          id: user.id,
          fullName: user["Full Name"],
          role: user.role,
          email: "",
          createdAt: ""
        }))
      );
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = () => {
    if (!selectedUser) return;
    onAssign(selectedUser, note);
    onOpenChange(false);
  };

  const dialogTitle = isForwarding ? "Aufgabe weiterleiten" : "Aufgabe zuweisen";
  const dialogDescription = isForwarding 
    ? "Wählen Sie einen Mitarbeiter, um die Aufgabe weiterzuleiten." 
    : "Wählen Sie einen Mitarbeiter, um die Aufgabe zuzuweisen.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-avanti-600" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="assign-user">Mitarbeiter auswählen</Label>
                <Select 
                  value={selectedUser} 
                  onValueChange={setSelectedUser}
                >
                  <SelectTrigger id="assign-user" className="w-full">
                    <SelectValue placeholder="Mitarbeiter wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      // Im Weiterleiten-Modus alle Benutzer anzeigen, sonst aktuelle Bearbeiter ausfiltern
                      .filter(user => isForwarding ? true : (!currentAssignee || user.id !== currentAssignee))
                      .map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName} ({user.role === 'admin' ? 'Administrator' : 'Agent'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assign-note">Notiz (optional)</Label>
                <Textarea
                  id="assign-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optionale Notiz zur Zuweisung..."
                />
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedUser || loading}
          >
            {isForwarding ? "Weiterleiten" : "Zuweisen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
