
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TaskChat } from "@/components/tasks/TaskChat";
import { ChevronLeft, User2, Users, Inbox, UserCheck, BookOpen, Maximize2, Clock, Check } from "lucide-react";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { KnowledgeArticleModal } from "@/components/knowledge-articles/KnowledgeArticleModal";
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { useTaskActivity } from '@/hooks/useTaskActivity';
import type { TaskStatus } from '@/types';

function classnames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [knowledgeArticle, setKnowledgeArticle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formattedTime } = useTaskTimer({
    taskId: id || '',
    isActive: true
  });
  const { logTaskStatusChange } = useTaskActivity();

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

  function renderArticlePreview(article: any) {
    if (!article) return (
      <Card className="rounded-xl shadow-md border-none bg-white/85">
        <CardHeader className="p-5 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="w-5 h-5" />
            <span className="font-semibold text-base">Wissensartikel</span>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 text-muted-foreground">
          Kein Wissensartikel verfügbar
        </CardContent>
      </Card>
    );

    let previewIntro = "";
    try {
      const div = document.createElement("div");
      div.innerHTML = article.content;
      const nodes = Array.from(div.childNodes) as HTMLElement[];
      let collected = "";
      let paraCount = 0;
      for (let node of nodes) {
        if (node.tagName === "H2" || node.tagName === "H3") continue;
        if (node.nodeType === 3) continue;
        if (node.tagName === "P") {
          collected += node.outerHTML;
          paraCount += 1;
          if (paraCount >= 2) break;
        }
      }
      previewIntro = collected || (div.textContent ?? "").split(".").slice(0, 2).join(".") + ".";
    } catch {
      previewIntro = "";
    }

    return (
      <Card className="rounded-xl shadow-md border-none bg-white/85">
        <CardHeader className="p-5 pb-3 flex flex-row items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-900" />
          <span className="font-semibold text-base text-blue-900">{article.title}</span>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="prose prose-sm font-serif text-gray-700 max-w-none line-clamp-3" 
            style={{
              fontFamily: 'Georgia, Times, "Times New Roman", serif',
              fontSize: '15px',
              WebkitLineClamp: 3,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
            dangerouslySetInnerHTML={{ __html: previewIntro }}
          />
          <Button
            variant="ghost"
            className="mt-3 text-primary underline px-0 hover:bg-muted"
            onClick={() => setIsArticleModalOpen(true)}
          >
            <Maximize2 className="w-4 h-4 mr-1" />
            Artikel anzeigen
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleCompleteTask = async () => {
    if (!task || !id) return;
    
    try {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', id);
      
      if (taskError) throw taskError;

      const { data: activeTimer } = await supabase
        .from('task_times')
        .select('id')
        .eq('task_id', id)
        .is('ended_at', null)
        .maybeSingle();

      if (activeTimer) {
        const { error: timerError } = await supabase
          .from('task_times')
          .update({ 
            ended_at: new Date().toISOString(),
            duration_seconds: Math.floor((Date.now() - new Date(task.started_at).getTime()) / 1000)
          })
          .eq('id', activeTimer.id);
          
        if (timerError) throw timerError;
      }

      await logTaskStatusChange(id, task.status as TaskStatus, 'completed' as TaskStatus);

      toast({
        title: "Aufgabe abgeschlossen",
        description: "Die Aufgabe wurde erfolgreich abgeschlossen.",
      });

      setTask({ ...task, status: 'completed' });

    } catch (error: any) {
      console.error('Error completing task:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Aufgabe konnte nicht abgeschlossen werden.",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Lade Aufgabe...</div>;
  }

  if (!task) {
    return <div className="text-center py-8">Aufgabe nicht gefunden</div>;
  }

  return (
    <div className="max-w-screen-xl mx-auto w-full px-3 md:px-8 py-5">
      <div className="bg-white/95 dark:bg-card/90 rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in p-0">
        <div className="flex items-center px-6 pt-6 pb-3 border-b border-muted bg-gradient-to-r from-avanti-100 to-avanti-200 rounded-t-2xl">
          <Button variant="ghost" onClick={() => navigate('/tasks')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
          <div className="flex-1" />
          <div className="text-sm font-medium bg-white/20 rounded-full px-4 py-1 flex items-center mr-4">
            <Clock className="h-4 w-4 mr-2" />
            {formattedTime}
          </div>
          {task?.status !== 'completed' && (
            <Button 
              onClick={handleCompleteTask}
              variant="secondary"
              className="mr-4 bg-green-100 text-green-700 hover:bg-green-200"
            >
              <Check className="h-4 w-4 mr-2" />
              Aufgabe abschließen
            </Button>
          )}
          <TaskStatusBadge status={task?.status || 'new'} />
        </div>
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-7 px-4 py-8 transition-all`}>
          <div className="flex flex-col gap-5 h-full">
            <Card className="rounded-xl shadow-md border-none bg-white/85">
              <CardContent className="p-6 pb-3 space-y-2">
                <h2 className="text-lg font-semibold mb-1">Aufgabendetails</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Inbox className="h-4 w-4" />
                  <span className="font-medium">Beschreibung</span>
                </div>
                <div className="ml-6 text-gray-700 whitespace-pre-wrap">{task.description}</div>
                
                {task.attachments?.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Inbox className="h-4 w-4" />
                      <span className="font-medium">Anhänge</span>
                    </div>
                    <ul className="ml-6 list-disc list-inside text-blue-600 text-sm space-y-1">
                      {task.attachments.map((url: string, index: number) => (
                        <li key={index}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            Datei {index + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">E-Mail Antwort</h3>
                  <textarea
                    rows={4}
                    placeholder="Antwort verfassen..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Button className="mt-2 bg-blue-600 hover:bg-blue-700 text-white">
                    Senden
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Kunde</span>
                </div>
                <div className="ml-6">{task.customer?.name || <span className="text-gray-400">Nicht zugewiesen</span>}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <User2 className="h-4 w-4" />
                  <span className="font-medium">Erstellt von</span>
                </div>
                <div className="ml-6">{task.creator?.["Full Name"] || <span className="text-gray-400">Unbekannt</span>}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">Zugewiesen an</span>
                </div>
                <div className="ml-6">{task.assignee?.["Full Name"] || <span className="text-gray-400">Nicht zugewiesen</span>}</div>
              </CardContent>
            </Card>
            {task.matched_use_case_id && (
              <>
                {renderArticlePreview(knowledgeArticle)}
                <KnowledgeArticleModal
                  open={isArticleModalOpen}
                  onClose={() => setIsArticleModalOpen(false)}
                  article={knowledgeArticle
                    ? { title: knowledgeArticle.title, content: knowledgeArticle.content }
                    : null}
                />
              </>
            )}
          </div>
          <div className="lg:col-span-2 flex w-full h-full min-h-[540px]">
            <div
              className="w-full max-w-full h-full min-h-[520px] max-h-[660px] bg-gradient-to-br from-white via-blue-50/60 to-blue-100/50 rounded-2xl shadow-md border-[1.5px] border-gray-100 flex flex-col justify-between overflow-hidden mb-8 mr-6"
              style={{
                boxSizing: "border-box",
                marginRight: "1.5rem",
                marginBottom: "2rem",
                padding: 0
              }}
            >
              <div className="flex flex-col justify-between h-full w-full" style={{ padding: "1.5rem" }}>
                <div className="pb-0">
                  <CardHeader className="p-0 pb-2 flex flex-row items-center border-none bg-transparent rounded-t-2xl">
                    <CardTitle className="text-xl font-semibold text-blue-900">Bearbeitung der Aufgabe</CardTitle>
                  </CardHeader>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0">
                    <TaskChat
                      taskId={task.id}
                      useCaseId={task.matched_use_case_id}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
