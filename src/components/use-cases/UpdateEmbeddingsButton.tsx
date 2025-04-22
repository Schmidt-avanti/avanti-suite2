
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function UpdateEmbeddingsButton() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdateEmbeddings = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings');
      
      if (error) throw error;

      toast({
        title: "Embeddings aktualisiert",
        description: data.message,
      });
    } catch (error: any) {
      console.error('Error updating embeddings:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Aktualisieren der Embeddings",
        description: error.message,
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
          Aktualisiere Embeddings...
        </>
      ) : (
        'Embeddings aktualisieren'
      )}
    </Button>
  );
}
