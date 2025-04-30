
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { EmailThread } from '@/types';
import { EmailReplyPanel } from './EmailReplyPanel';

interface EmailReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  thread: EmailThread | null;
  onEmailSent: () => void;
}

export function EmailReplyDialog({
  open,
  onOpenChange,
  taskId,
  thread,
  onEmailSent,
}: EmailReplyDialogProps) {
  const [replyTo, setReplyTo] = useState<string>('');

  // Set reply-to when thread changes
  useEffect(() => {
    if (thread && thread.direction === 'inbound') {
      setReplyTo(thread.sender);
    }
  }, [thread]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>E-Mail Antwort</DialogTitle>
          {thread && (
            <DialogDescription>
              Antwort auf E-Mail von {thread.sender}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="py-4">
          <EmailReplyPanel
            taskId={taskId}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            activeThread={thread}
            clearActiveThread={() => handleClose()}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
