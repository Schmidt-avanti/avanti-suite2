import React from 'react';
import { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, UserCircle, FileText, Edit3, ArrowLeft, CheckCircle2 as CheckCircleIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface CompletedTaskOverlayProps {
  task: Task & { // Task already includes updated_at from the updated types/index.ts
    creator?: { 'Full Name'?: string }; 
    // closed_by_user is no longer expected to be populated directly on the task object for this overlay
  };
  onReopenTask: () => void;
  onBackClick: () => void;
}

const InfoLine: React.FC<{ icon: React.ElementType; label: string; value?: string | null }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center space-x-3 py-2 border-b border-gray-200 last:border-b-0">
    <Icon className="h-5 w-5 text-gray-500" />
    <span className="font-medium text-gray-700">{label}:</span>
    <span className="text-gray-600 break-all">{value || 'N/A'}</span>
  </div>
);

export const CompletedTaskOverlay: React.FC<CompletedTaskOverlayProps> = ({ task, onReopenTask, onBackClick }) => {
  // Task object should conform to the updated Task interface from '@/types'
  const typedTask = task; // Direct use, as Task type should now be accurate

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd. MMMM yyyy, HH:mm', { locale: de }) + ' Uhr';
    } catch (e) {
      return 'Ungültiges Datum';
    }
  };

  const openedByName = typedTask.creator?.['Full Name'] || 'Unbekannt';
  const closedByName = "N/A (wird später implementiert)";

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white shadow-2xl rounded-lg overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <CardTitle className="text-2xl font-semibold text-gray-800">
                Aufgabe Abgeschlossen: {task.readable_id || task.title || 'Unbekannt'}
              </CardTitle>
              <p className="text-sm text-gray-500">Details zum abgeschlossenen Vorgang.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <InfoLine icon={UserCircle} label="Geöffnet von" value={openedByName} />
          <InfoLine icon={CalendarDays} label="Geöffnet am" value={formatDate(typedTask.created_at)} />
          <InfoLine icon={UserCircle} label="Geschlossen von" value={closedByName} />
          <InfoLine icon={CalendarDays} label="Geschlossen am" value={formatDate(typedTask.updated_at)} />
          {typedTask.matched_use_case_title && (
            <InfoLine icon={CheckCircleIcon} label="Angewandter Use Case" value={typedTask.matched_use_case_title} />
          )}
          <div className="pt-3">
            <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-500" />
              Abschließende Zusammenfassung:
            </h3>
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200 max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {task.closing_comment || 'Keine Zusammenfassung vorhanden.'}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <Button variant="outline" onClick={onBackClick} className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
            <Button variant="outline" onClick={onReopenTask} className="w-full sm:w-auto">
              <Edit3 className="w-4 h-4 mr-2" />
              Aufgabe wieder öffnen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
