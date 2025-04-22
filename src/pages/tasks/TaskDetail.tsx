
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
  const [knowledgeArticle, setKnowledgeArticle] = useState<any>(null);
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
      
      // Fetch the task without complex joins first
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (taskError) throw taskError;
      if (!taskData) throw new Error('Aufgabe nicht gefunden');

      // Separately fetch the related data
      const fetchRelatedData = async () => {
        // Fetch customer
        let customer = null;
        if (taskData.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('name')
            .eq('id', taskData.customer_id)
            .maybeSingle();
          customer = customerData;
        }

        // Fetch creator
        let creator = null;
        if (taskData.created_by) {
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('id, "Full Name"')
            .eq('id', taskData.created_by)
            .maybeSingle();
          creator = creatorData;
        }

        // Fetch assignee
        let assignee = null;
        if (taskData.assigned_to) {
          const { data: assigneeData } = await supabase
            .from('profiles')
            .select('id, "Full Name"')
            .eq('id', taskData.assigned_to)
            .maybeSingle();
          assignee = assigneeData;
        }

        return {
          customer,
          creator,
          assignee
        };
      };

      // Get related data
      const relatedData = await fetchRelatedData();
      
      // Combine task with related data
      const enrichedTask = {
        ...taskData,
        customer: relatedData.customer,
        creator: relatedData.creator,
        assignee: relatedData.assignee
      };

      setTask(enrichedTask);

      // If there's a matched use case, fetch knowledge article related to it
      if (taskData.matched_use_case_id) {
        const { data: knowledgeArticleData, error: knowledgeArticleError } = await supabase
          .from('knowledge_articles')
          .select('*')
          .eq('use_case_id', taskData.matched_use_case_id)
          .maybeSingle();

        if (!knowledgeArticleError && knowledgeArticleData) {
          setKnowledgeArticle(knowledgeArticleData);
        }
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
            </CardContent>
          </Card>

          {/* Knowledge Article Section */}
          {task.matched_use_case_id && (
            <Card>
              <CardHeader>
                <CardTitle>Wissensartikel</CardTitle>
              </CardHeader>
              <CardContent>
                {knowledgeArticle ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{knowledgeArticle.title}</h3>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: knowledgeArticle.content }} 
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground">Kein Wissensartikel verfügbar</p>
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
