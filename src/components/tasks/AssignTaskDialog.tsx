
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
import { User } from "@/types";

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (userId: string, note: string) => void;
  currentAssignee?: string;
  isForwarding?: boolean;
}

// Create an interface that matches the actual shape of data from the database
interface ProfileWithRole {
  id: string;
  "Full Name": string;
  role: string;
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
  isForwarding = false 
}: AssignTaskDialogProps) {
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      fetchUsers();
    } else {
      // Reset form when closing
      setSelectedUser("");
      setNote("");
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, \"Full Name\", role")
        .eq("is_active", true)
        .or("role.eq.admin,role.eq.agent");

      if (error) throw error;

      // Transform the data to match the UserDisplay interface
      setUsers(
        (data as ProfileWithRole[] || []).map(user => ({
          id: user.id,
          fullName: user["Full Name"],
          role: user.role,
          // Adding placeholder values to satisfy the User type
          email: "",
          createdAt: ""
        }))
      );
    } catch (err) {
      console.error("Error fetching users:", err);
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
                      .filter(user => !currentAssignee || user.id !== currentAssignee)
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
