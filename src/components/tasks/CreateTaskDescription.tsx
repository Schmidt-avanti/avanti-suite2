
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
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
  const minLength = 10;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (description.length < minLength) {
      toast({
        title: "Beschreibung zu kurz",
        description: `Bitte geben Sie eine ausführlichere Nachricht ein (mind. ${minLength} Zeichen).`,
        variant: "destructive",
      });
      return;
    }
    onSubmit();
  };

  return (
    <div className="relative">
      <Textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Was soll erledigt werden?"
        className="min-h-[110px] max-h-[320px] w-full pl-4 pr-14 py-4 rounded-lg bg-muted/40 border border-muted shadow-inner focus-visible:ring-2 focus-visible:ring-primary/60 focus:border-primary transition-all placeholder:text-[16px] placeholder:text-muted-foreground font-normal text-base resize-y"
        disabled={isMatching}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
        }}
      />
      {/* Senden-Button als Icon unten rechts */}
      <div className="absolute bottom-2 right-2 z-10">
        <Button
          type="button"
          rounded="full"
          variant="default"
          size="icon"
          onClick={handleSubmit}
          disabled={isMatching || description.length < minLength}
          className="rounded-full h-10 w-10 shadow-sm bg-gradient-to-tr from-[#4f8df9] to-[#007bff] hover:from-[#007bff] hover:to-[#4f8df9] text-white transition-all focus:ring-2 focus:ring-primary/30"
          tabIndex={-1}
        >
          {isMatching ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Send className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  );
}
