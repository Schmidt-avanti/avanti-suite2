
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
  Info
} from "lucide-react";
import { KnowledgeArticlesList } from './KnowledgeArticlesList';
import { supabase } from '@/integrations/supabase/client';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface TaskDetailInfoProps {
  task: any;
}

interface Endkunde {
  id: string;
  Nachname: string;
  Vorname: string | null;
  Adresse: string;
  Postleitzahl: string;
  Ort: string;
  Wohnung: string | null;
  Gebaeude: string | null;
  Lage: string | null;
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
        // Define the response type with the exact property names from the database
        type EndkundeResponse = {
          id: string;
          Nachname: string;
          Vorname: string | null;
          Adresse: string;
          Wohnung: string | null;
          Gebäude: string | null; // Note the 'ä' here which is different from Gebaeude
          Lage: string | null;
          Postleitzahl: string;
          Ort: string;
          email: string | null;
          telefon: string | null;
        };
        
        const { data, error } = await supabase
          .from('endkunden')
          .select('*')
          .eq('id', task.endkunde_id)
          .single() as { data: EndkundeResponse, error: any };
          
        if (error) throw error;
        
        // Map the response data to the expected format with consistent property names
        if (data) {
          const mappedEndkunde: Endkunde = {
            id: data.id,
            Nachname: data.Nachname,
            Vorname: data.Vorname,
            Adresse: data.Adresse,
            Postleitzahl: data.Postleitzahl,
            Ort: data.Ort,
            Wohnung: data.Wohnung,
            Gebaeude: data.Gebäude, // Map from Gebäude to Gebaeude
            Lage: data.Lage,
            email: data.email,
            telefon: data.telefon
          };
          setEndkunde(mappedEndkunde);
        }
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

          {/* Endkunde information - simplified view with popover for details */}
          {endkunde && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                <Home className="h-4 w-4" />
                <span className="font-medium">Endkunde</span>
              </div>
              <div className="ml-6">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">
                    {endkunde.Nachname}
                    {endkunde.Vorname && <span>, {endkunde.Vorname}</span>}
                  </span>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Info className="h-4 w-4 text-blue-500" />
                              <span className="sr-only">Mehr Informationen</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4">
                            <div className="space-y-4">
                              <h4 className="font-medium text-sm text-gray-500">Kontaktdetails</h4>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <h5 className="text-sm font-medium text-gray-500">Adresse:</h5>
                                  <p className="text-sm">{endkunde.Adresse}</p>
                                  <p className="text-sm">{endkunde.Postleitzahl} {endkunde.Ort}</p>
                                </div>
                                
                                {(endkunde.Wohnung || endkunde.Gebaeude || endkunde.Lage) && (
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-500">Details:</h5>
                                    {endkunde.Gebaeude && <p className="text-sm">Gebäude: {endkunde.Gebaeude}</p>}
                                    {endkunde.Wohnung && <p className="text-sm">Wohnung: {endkunde.Wohnung}</p>}
                                    {endkunde.Lage && <p className="text-sm">Lage: {endkunde.Lage}</p>}
                                  </div>
                                )}
                              </div>
                              
                              {(endkunde.email || endkunde.telefon) && (
                                <div className="pt-2 border-t border-gray-200">
                                  <h5 className="text-sm font-medium text-gray-500">Kontakt:</h5>
                                  {endkunde.email && (
                                    <p className="text-sm">
                                      Email: <a href={`mailto:${endkunde.email}`} className="text-blue-600 hover:underline">
                                        {endkunde.email}
                                      </a>
                                    </p>
                                  )}
                                  {endkunde.telefon && <p className="text-sm">Tel: {endkunde.telefon}</p>}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mehr Informationen anzeigen</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* Simple address line */}
                <p className="text-sm text-gray-500">
                  {endkunde.Adresse}, {endkunde.Postleitzahl} {endkunde.Ort}
                </p>
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
