
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2 } from 'lucide-react';

interface CloseTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: (comment: string) => void;
}

export function CloseTaskDialog({ open, onOpenChange, onClose }: CloseTaskDialogProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onClose(comment);
      setComment('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error closing task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState) {
      setComment('');
    }
    onOpenChange(newOpenState);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aufgabe abschließen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="close-comment">
              Abschlusskommentar
            </Label>
            <Textarea
              id="close-comment"
              placeholder="Bitte geben Sie einen Abschlusskommentar ein..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !comment.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird abgeschlossen...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Aufgabe abschließen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
