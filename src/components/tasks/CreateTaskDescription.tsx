
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CreateTaskDescriptionProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  isMatching: boolean;
}

export function CreateTaskDescription({
  description,
  onDescriptionChange,
  onSubmit,
  isMatching,
}: CreateTaskDescriptionProps) {
  const { toast } = useToast();
  
  const handleSubmit = () => {
    if (description.length < 10) {
      toast({
        title: "Beschreibung zu kurz",
        description: "Bitte geben Sie eine ausführlichere Beschreibung ein (mind. 10 Zeichen).",
        variant: "destructive",
      });
      return;
    }
    onSubmit();
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Beschreiben Sie die Aufgabe..."
            className="min-h-[200px] resize-y"
            disabled={isMatching}
          />
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={isMatching || description.length < 10}
          >
            {isMatching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analysiere...
              </>
            ) : (
              "Aufgabe erstellen"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
