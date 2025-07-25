import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, User, Calendar, Tag, MessageSquare, Paperclip } from 'lucide-react';
import { Task } from '@/types';

interface TaskDetailInfoProps {
  task: Task;
}

export const TaskDetailInfo: React.FC<TaskDetailInfoProps> = ({ task }) => {
  // Helper function to extract filename from URL
  const getFilenameFromUrl = (url: string): string => {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1] || 'Anhang';
  };

  return (
    <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-4">
      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
        <FileText className="h-4 w-4 mr-2" />
        {task.readable_id && (
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-xs font-medium mr-2">
            {task.readable_id}
          </span>
        )}
        {task.title}
      </h3>

      <div className="text-sm text-gray-600 whitespace-pre-wrap mb-4">
        {task.description}
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-start">
          <User className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
          <div>
            <span className="text-gray-500">Kunde: </span>
            <span className="font-medium">{task.customer?.name || 'Unbekannt'}</span>
          </div>
        </div>

        {task.assigned_to && (
          <div className="flex items-start">
            <User className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
            <div>
              <span className="text-gray-500">Zugewiesen an: </span>
              <span className="font-medium">{task.assignee?.["Full Name"] || 'Unbekannt'}</span>
            </div>
          </div>
        )}

        {/* Display forwarding note if it exists */}
        {task.forwarded_to && (
          <div className="flex items-start mt-1">
            <MessageSquare className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
            <div>
              <span className="text-gray-500">Notiz zur Weiterleitung: </span>
              <span className="font-medium italic">{task.forwarded_to}</span>
            </div>
          </div>
        )}

        {task.created_at && (
          <div className="flex items-start">
            <Calendar className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
            <div>
              <span className="text-gray-500">Erstellt: </span>
              <span className="font-medium">
                {format(new Date(task.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                {' '} ({formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: de })})
              </span>
            </div>
          </div>
        )}

        {task.follow_up_date && (
          <div className="flex items-start">
            <Calendar className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
            <div>
              <span className="text-gray-500">Wiedervorlage: </span>
              <span className="font-medium">
                {format(new Date(task.follow_up_date), 'dd.MM.yyyy', { locale: de })}
              </span>
            </div>
          </div>
        )}

        {task.source && (
          <div className="flex items-start">
            <Tag className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
            <div>
              <span className="text-gray-500">Quelle: </span>
              <span className="font-medium capitalize">
                {/* Zeige schönere Labels für die Quellen an */}
                {task.source === 'inbound' && 'Eingehend'}
                {task.source === 'outbound' && 'Ausgehend'}
                {task.source === 'email' && 'E-Mail'}
                {task.source === 'chat' && 'Chat'}
                {task.source === 'manual' && 'Manuell'}
                {!['inbound', 'outbound', 'email', 'chat', 'manual'].includes(task.source) && task.source}
              </span>
            </div>
          </div>
        )}

        {/* Blanko-Aufgaben-Kennzeichnung */}
        {task.is_blank_task && (
          <div className="flex items-start mt-2">
            <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs">
              Blanko-Aufgabe ohne Ava-Unterstützung
            </div>
          </div>
        )}

        {/* Display Matched Use Case */}
        <div className="flex items-start">
          <FileText className="h-4 w-4 mr-2 mt-0.5 text-gray-500" /> {/* Using FileText as a placeholder, consider a more specific icon */}
          <div>
            <span className="text-gray-500">Use Case: </span>
            <span className="font-medium">
              {task.matched_use_case_title || 'Kein Use Case zugewiesen'}
            </span>
          </div>
        </div>

        {/* New section to display attachments */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="flex items-start mt-2">
            <Paperclip className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
            <div>
              <span className="text-gray-500">Anhänge: </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {task.attachments.map((url: string, i: number) => {
                  const filename = getFilenameFromUrl(url);
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm text-blue-600"
                    >
                      <Paperclip className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span className="truncate max-w-[150px]">{filename}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
