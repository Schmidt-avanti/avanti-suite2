
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  User2,
  Users,
  Inbox,
  UserCheck,
  XCircle,
  Hash,
  Home,
  Phone,
  Mail,
  MapPin
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
        
        // Create endkunde object with all required fields, providing null for missing ones
        const endkundeData: Endkunde = {
          id: data.id,
          nachname: data.Nachname,
          vorname: data.Vorname,
          adresse: data.Adresse,
          postleitzahl: data.Postleitzahl,
          ort: data.Ort,
          wohnung: data.Wohnung,
          gebaeude: data.Gebäude,
          lage: data.Lage,
          email: null, // This field doesn't exist in the database
          telefon: null // This field doesn't exist in the database
        };
        
        setEndkunde(endkundeData);
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

          {/* Enhanced Endkunde information if available */}
          {endkunde && (
            <div className="mt-5 bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-blue-800 font-medium mb-2">
                <Home className="h-5 w-5" />
                <span>Endkunde Informationen</span>
              </div>
              <div className="space-y-3 ml-2">
                <div className="flex items-center">
                  <User2 className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">{endkunde.nachname}</span>
                    {endkunde.vorname && <span>, {endkunde.vorname}</span>}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span>{endkunde.adresse}</span>
                    <span>{endkunde.postleitzahl} {endkunde.ort}</span>
                    {(endkunde.wohnung || endkunde.gebaeude || endkunde.lage) && (
                      <div className="text-gray-600 text-sm mt-1">
                        {endkunde.gebaeude && <div>Gebäude: {endkunde.gebaeude}</div>}
                        {endkunde.wohnung && <div>Wohnung: {endkunde.wohnung}</div>}
                        {endkunde.lage && <div>Lage: {endkunde.lage}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email from the task since it's not in endkunden table */}
                {task.endkunde_email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                    <a href={`mailto:${task.endkunde_email}`} className="text-blue-600 hover:underline">
                      {task.endkunde_email}
                    </a>
                  </div>
                )}
              </div>
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
      
      {/* Knowledge Articles Section */}
      <KnowledgeArticlesList 
        customerId={task.customer_id}
        taskDescription={task.description}
      />
    </div>
  );
};
