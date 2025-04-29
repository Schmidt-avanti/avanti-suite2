
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  User2,
  Users,
  Inbox,
  UserCheck,
  XCircle,
} from "lucide-react";
import { KnowledgeArticlesList } from './KnowledgeArticlesList';

interface TaskDetailInfoProps {
  task: any;
}

export const TaskDetailInfo: React.FC<TaskDetailInfoProps> = ({ task }) => {
  return (
    <div className="flex flex-col gap-5">
      <Card className="rounded-xl shadow-md border-none bg-white/85">
        <CardContent className="p-6 pb-3 space-y-2 break-words whitespace-pre-wrap">
          <h2 className="text-lg font-semibold mb-1">Aufgabendetails</h2>
          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Inbox className="h-4 w-4" />
            <span className="font-medium">Beschreibung</span>
          </div>
          <div className="ml-6 text-gray-700">{task.description}</div>

          {task.attachments?.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-muted-foreground mb-1">Anhänge</div>
              <ul className="ml-6 list-disc text-blue-600 text-sm space-y-1">
                {task.attachments.map((url: string, i: number) => (
                  <li key={i}><a href={url} target="_blank" rel="noreferrer">Datei {i + 1}</a></li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <Users className="h-4 w-4" />
            <span className="font-medium">Kunde</span>
          </div>
          <div className="ml-6">{task.customer?.name || 'Nicht zugewiesen'}</div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <User2 className="h-4 w-4" />
            <span className="font-medium">Erstellt von</span>
          </div>
          <div className="ml-6 break-words">
            {task.source === 'email' && task.endkunde_email
              ? task.endkunde_email
              : task.creator?.["Full Name"] || <span className="text-gray-400">Unbekannt</span>}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <UserCheck className="h-4 w-4" />
            <span className="font-medium">Zugewiesen an</span>
          </div>
          <div className="ml-6">
            {task.assignee?.["Full Name"] || <span className="text-gray-400">Nicht zugewiesen</span>}
          </div>
          
          {task.closing_comment && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Abschlussdokumentation</span>
              </div>
              <div className="ml-6 text-gray-700">{task.closing_comment}</div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Knowledge Articles Section - Now passing the task description */}
      <KnowledgeArticlesList 
        customerId={task.customer_id}
        taskDescription={task.description}
      />
    </div>
  );
};
