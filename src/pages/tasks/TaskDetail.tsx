import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TaskChat } from "@/components/tasks/TaskChat";
import { ChevronLeft, User2, Users, Inbox, UserCheck } from "lucide-react";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";

function classnames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

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
      
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (taskError) throw taskError;
      if (!taskData) throw new Error('Aufgabe nicht gefunden');

      const fetchRelatedData = async () => {
        let customer = null;
        if (taskData.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('name')
            .eq('id', taskData.customer_id)
            .maybeSingle();
          customer = customerData;
        }

        let creator = null;
        if (taskData.created_by) {
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('id, "Full Name"')
            .eq('id', taskData.created_by)
            .maybeSingle();
          creator = creatorData;
        }

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

      const relatedData = await fetchRelatedData();
      
      const enrichedTask = {
        ...taskData,
        customer: relatedData.customer,
        creator: relatedData.creator,
        assignee: relatedData.assignee
      };

      setTask(enrichedTask);

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
    <div className="max-w-screen-xl mx-auto p-4 md:p-8 w-full">
      <div className="bg-white/95 dark:bg-card/90 rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
        <div className="flex items-center px-6 pt-6 pb-3 border-b border-muted bg-gradient-to-r from-avanti-100 to-avanti-200 rounded-t-2xl">
          <Button variant="ghost" onClick={() => navigate('/tasks')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
          <div className="flex-1" />
          <TaskStatusBadge status={task.status} />
        </div>
        <div className="
          grid lg:grid-cols-3 grid-cols-1 gap-8
          px-4 py-8
          transition-all
        ">
          <div className="flex flex-col gap-6">
            <Card className="rounded-xl shadow-md border-none p-0 bg-white/85">
              <CardContent className="p-5 space-y-3">
                <h2 className="text-lg font-semibold mb-1">{task.title}</h2>
                <div className="space-y-2 mt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Inbox className="h-4 w-4" />
                    <span className="font-medium">Beschreibung</span>
                  </div>
                  <div className="ml-6 text-gray-700 whitespace-pre-wrap">{task.description}</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Kunde</span>
                </div>
                <div className="ml-6">{task.customer?.name || <span className="text-gray-400">Nicht zugewiesen</span>}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <User2 className="h-4 w-4" />
                  <span className="font-medium">Erstellt von</span>
                </div>
                <div className="ml-6">{task.creator?.["Full Name"] || <span className="text-gray-400">Unbekannt</span>}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">Zugewiesen an</span>
                </div>
                <div className="ml-6">{task.assignee?.["Full Name"] || <span className="text-gray-400">Nicht zugewiesen</span>}</div>
              </CardContent>
            </Card>
            {task.matched_use_case_id && (
              <Card className="rounded-xl shadow-md border-none p-0 bg-white/85">
                <CardHeader className="p-5 pb-3 flex flex-col gap-1">
                  <span className="text-base font-semibold text-muted-foreground">Wissensartikel</span>
                  <span className="text-lg font-medium">
                    {knowledgeArticle ? knowledgeArticle.title : "Kein Wissensartikel verfügbar"}
                  </span>
                </CardHeader>
                <div className="px-5 pb-5">
                  <div
                    className="
                      max-h-[450px] overflow-y-auto custom-scrollbar
                      bg-white/70 rounded-xl border border-muted/50 p-4
                      prose prose-sm prose-h2:text-base prose-h2:mt-5 prose-h2:mb-1 font-serif
                    "
                    style={{ fontFamily: 'Georgia, Times, "Times New Roman", serif', fontSize: '15px' }}
                  >
                    {knowledgeArticle ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: knowledgeArticle.content
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground">Kein Wissensartikel verfügbar</span>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
          <div className="lg:col-span-2 flex w-full ">
            <div
              className="
                w-full 
                max-w-full
                h-[min(600px,80vh)]
                mb-8 mr-6 
                bg-gradient-to-br from-white via-blue-50/60 to-blue-100/50
                rounded-2xl 
                shadow-lg 
                border-[1.5px] border-gray-100 
                flex flex-col 
                justify-between
                overflow-hidden
              "
            >
              <div className="px-0 py-0 flex flex-col h-full">
                <CardHeader className="p-6 pb-0 flex flex-row items-center border-b border-b-[#f2f6fb] bg-white/75 rounded-t-2xl">
                  <CardTitle className="text-xl font-semibold text-blue-900">Bearbeitung der Aufgabe</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-2 pb-0 px-0">
                  <TaskChat 
                    taskId={task.id} 
                    useCaseId={task.matched_use_case_id} 
                  />
                </CardContent>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
