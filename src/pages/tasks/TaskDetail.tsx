
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TaskChat } from "@/components/tasks/TaskChat";
import { ChevronLeft } from "lucide-react";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [useCase, setUseCase] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchTaskDetails();
    }
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      setIsLoading(true);
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          customer:customers(name),
          creator:profiles!tasks_created_by_fkey(id, "Full Name"),
          assignee:profiles!tasks_assigned_to_fkey(id, "Full Name")
        `)
        .eq('id', id)
        .maybeSingle();

      if (taskError) throw taskError;
      if (!taskData) throw new Error('Aufgabe nicht gefunden');

      setTask(taskData);

      // If there's a matched use case, fetch it
      if (taskData.matched_use_case_id) {
        const { data: useCaseData, error: useCaseError } = await supabase
          .from('use_cases')
          .select('*')
          .eq('id', taskData.matched_use_case_id)
          .maybeSingle();

        if (useCaseError) throw useCaseError;
        setUseCase(useCaseData);
      }
    } catch (error: any) {
      console.error('Error fetching task details:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Lade Aufgabe...</div>;
  }

  if (!task) {
    return <div className="text-center py-8">Aufgabe nicht gefunden</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/tasks')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Zurück zur Übersicht
        </Button>
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Info Section */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{task.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Beschreibung</p>
                <p className="mt-1 whitespace-pre-wrap">{task.description}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Kunde</p>
                <p className="mt-1">{task.customer?.name || 'Nicht zugewiesen'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Erstellt von</p>
                <p className="mt-1">{task.creator?.["Full Name"] || 'Unbekannt'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Zugewiesen an</p>
                <p className="mt-1">{task.assignee?.["Full Name"] || 'Nicht zugewiesen'}</p>
              </div>

              {task.matched_use_case_id && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Zugeordneter Use Case</p>
                  <div className="mt-1 flex items-center">
                    <Badge variant="outline" className="mr-2">
                      {useCase?.title || 'Lädt...'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {task.match_confidence 
                        ? `${Math.round(task.match_confidence)}% Übereinstimmung` 
                        : 'Nicht berechnet'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {useCase && (
            <Card>
              <CardHeader>
                <CardTitle>Use Case Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {useCase.information_needed && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Benötigte Informationen</p>
                    <p className="mt-1 whitespace-pre-wrap">{useCase.information_needed}</p>
                  </div>
                )}
                
                {useCase.steps && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Schritte</p>
                    <p className="mt-1 whitespace-pre-wrap">{useCase.steps}</p>
                  </div>
                )}
                
                {useCase.expected_result && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Erwartetes Ergebnis</p>
                    <p className="mt-1 whitespace-pre-wrap">{useCase.expected_result}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Bearbeitung der Aufgabe</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskChat 
                taskId={task.id} 
                useCaseId={task.matched_use_case_id} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
