
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  User2,
  Users,
  Inbox,
  UserCheck,
  XCircle,
  Hash,
  Home
} from "lucide-react";
import { KnowledgeArticlesList } from './KnowledgeArticlesList';
import { supabase } from '@/integrations/supabase/client';

interface TaskDetailInfoProps {
  task: any;
}

interface Endkunde {
  id: string;
  nachname: string;
  vorname: string | null;
  adresse: string;
  postleitzahl: string;
  ort: string;
  wohnung: string | null;
  gebaeude: string | null;
  lage: string | null;
  email: string | null;
  telefon: string | null;
}

export const TaskDetailInfo: React.FC<TaskDetailInfoProps> = ({ task }) => {
  const [endkunde, setEndkunde] = useState<Endkunde | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEndkunde = async () => {
      if (!task.endkunde_id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('endkunden')
          .select('*')
          .eq('id', task.endkunde_id)
          .single();
          
        if (error) throw error;
        setEndkunde(data);
      } catch (err) {
        console.error('Error fetching endkunde:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEndkunde();
  }, [task.endkunde_id]);
  
  return (
    <div className="flex flex-col gap-5">
      <Card className="rounded-xl shadow-md border-none bg-white/85">
        <CardContent className="p-6 pb-3 space-y-2 break-words whitespace-pre-wrap">
          <h2 className="text-lg font-semibold mb-1">Aufgabendetails</h2>
          
          {/* Display Task ID if available */}
          {task.readable_id && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 mb-3">
              <Hash className="h-4 w-4" />
              <span className="font-medium">Aufgabennummer</span>
              <span className="font-mono font-semibold text-blue-700">{task.readable_id}</span>
            </div>
          )}
          
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

          {/* Endkunde information if available */}
          {endkunde && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                <Home className="h-4 w-4" />
                <span className="font-medium">Endkunde</span>
              </div>
              <div className="ml-6 space-y-1">
                <div>
                  <span className="font-medium">{endkunde.nachname}</span>
                  {endkunde.vorname && <span> {endkunde.vorname}</span>}
                </div>
                <div>{endkunde.adresse}</div>
                <div>{endkunde.postleitzahl} {endkunde.ort}</div>
                {(endkunde.wohnung || endkunde.gebaeude || endkunde.lage) && (
                  <div className="text-gray-600">
                    {endkunde.gebaeude && <span>Gebäude: {endkunde.gebaeude} • </span>}
                    {endkunde.wohnung && <span>Wohnung: {endkunde.wohnung} • </span>}
                    {endkunde.lage && <span>Lage: {endkunde.lage}</span>}
                  </div>
                )}
                {(endkunde.email || endkunde.telefon) && (
                  <div className="text-gray-600">
                    {endkunde.email && (
                      <div>Email: <a href={`mailto:${endkunde.email}`} className="text-blue-600 hover:underline">
                        {endkunde.email}
                      </a></div>
                    )}
                    {endkunde.telefon && <div>Tel: {endkunde.telefon}</div>}
                  </div>
                )}
              </div>
            </>
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
