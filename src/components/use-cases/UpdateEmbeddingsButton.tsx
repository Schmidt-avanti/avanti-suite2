
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function UpdateEmbeddingsButton({ useCaseId }: { useCaseId: string }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateEmbeddings = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: JSON.stringify({ useCaseIds: [useCaseId] })
      });
      
      if (error) throw error;

      toast.success("Embedding erfolgreich aktualisiert", {
        description: data.processed?.length 
          ? `Use Case mit ID ${useCaseId} aktualisiert` 
          : "Keine Aktualisierung erforderlich"
      });
    } catch (error: any) {
      console.error('Error updating embeddings:', error);
      toast.error("Fehler beim Aktualisieren der Embeddings", {
        description: error.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button 
      variant="outline"
      onClick={handleUpdateEmbeddings}
      disabled={isUpdating}
    >
      {isUpdating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Aktualisiere…
        </>
      ) : (
        <>
          <Database className="mr-2 h-4 w-4" />
          Embedding erneuern
        </>
      )}
    </Button>
  );
}
