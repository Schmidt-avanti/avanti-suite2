
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Trash2 } from 'lucide-react';
import { useReminders } from '@/hooks/useReminders';
import { ReminderDialog } from './ReminderDialog';
import { useToast } from '@/hooks/use-toast';

export const RemindersList = () => {
  const { reminders, completeReminder, deleteReminder, isLoading } = useReminders();
  const { toast } = useToast();

  const handleComplete = async (id: string, title: string) => {
    await completeReminder(id);
    toast({
      title: "Notiz erledigt",
      description: `"${title}" wurde als erledigt markiert.`,
    });
  };

  const handleDelete = async (id: string, title: string) => {
    await deleteReminder(id);
    toast({
      title: "Notiz gelöscht",
      description: `"${title}" wurde gelöscht.`,
    });
  };

  if (isLoading) return <div className="flex justify-center py-4">Laden...</div>;

  return (
    <Card className="w-full bg-avanti-50/30">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-avanti-800 uppercase tracking-wide">Meine Notizen</CardTitle>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <p className="text-center text-avanti-600 py-4">
            Keine Notizen vorhanden
          </p>
        ) : (
          <div className="space-y-4">
            {reminders.map((reminder) => (
              <div 
                key={reminder.id} 
                className="flex flex-col bg-white p-3 rounded-lg hover:bg-avanti-50 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-avanti-900">{reminder.title}</div>
                    {reminder.remind_at && (
                      <div className="text-xs text-avanti-600 mt-1">
                        {format(new Date(reminder.remind_at), 'dd.MM.yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleComplete(reminder.id, reminder.title)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(reminder.id, reminder.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <ReminderDialog />
        </div>
      </CardContent>
    </Card>
  );
};
