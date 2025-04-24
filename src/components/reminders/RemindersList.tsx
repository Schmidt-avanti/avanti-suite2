
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
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">📝 Meine Notizen</CardTitle>
        <ReminderDialog />
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Keine Notizen vorhanden
          </p>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div 
                key={reminder.id} 
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
              >
                <div>
                  <div className="font-medium">{reminder.title}</div>
                  {reminder.remind_at && (
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(reminder.remind_at), 'dd.MM.yyyy HH:mm')}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleComplete(reminder.id, reminder.title)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => handleDelete(reminder.id, reminder.title)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
