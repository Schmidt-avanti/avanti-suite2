// All imports remain the same
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

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [knowledgeArticle, setKnowledgeArticle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formattedTime } = useTaskTimer({ taskId: id || '', isActive: true });
  const { logTaskStatusChange } = useTaskActivity();

  useEffect(() => {
    if (id) fetchTaskDetails();
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

      const customerPromise = taskData.customer_id
        ? supabase.from('customers').select('name').eq('id', taskData.customer_id).maybeSingle()
        : Promise.resolve({ data: null });

      const creatorPromise = taskData.created_by
        ? supabase.from('profiles').select('id, "Full Name"').eq('id', taskData.created_by).maybeSingle()
        : Promise.resolve({ data: null });

      const assigneePromise = taskData.assigned_to
        ? supabase.from('profiles').select('id, "Full Name"').eq('id', taskData.assigned_to).maybeSingle()
        : Promise.resolve({ data: null });

      const [customer, creator, assignee] = await Promise.all([
        customerPromise,
        creatorPromise,
        assigneePromise
      ]);

      const enrichedTask = {
        ...taskData,
        customer: customer.data,
        creator: creator.data,
        assignee: assignee.data
      };

      setTask(enrichedTask);

      if (taskData.matched_use_case_id) {
        const { data: article } = await supabase
          .from('knowledge_articles')
          .select('*')
          .eq('use_case_id', taskData.matched_use_case_id)
          .maybeSingle();

        if (article) setKnowledgeArticle(article);
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task || !id) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', id);
      if (error) throw error;

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
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Aufgabe konnte nicht abgeschlossen werden.",
      });
    }
  };

  const renderArticlePreview = (article: any) => {
    if (!article) return null;
    let preview = "";
    try {
      const div = document.createElement("div");
      div.innerHTML = article.content;
      preview = (div.textContent ?? "").split(".").slice(0, 2).join(".") + ".";
    } catch {}
    return (
      <Card className="rounded-xl shadow-md border-none bg-white/85">
        <CardHeader className="p-5 pb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-900" />
          <span className="font-semibold text-base text-blue-900">{article.title}</span>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="text-sm text-gray-700 line-clamp-3">{preview}</div>
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
  };

  if (isLoading) return <div className="text-center py-8">Lade Aufgabe...</div>;
  if (!task) return <div className="text-center py-8">Aufgabe nicht gefunden</div>;

  return (
    <div className="max-w-screen-xl mx-auto w-full px-3 md:px-8 py-5">
      <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-0">
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
          {task.status !== 'completed' && (
            <Button 
              onClick={handleCompleteTask}
              variant="secondary"
              className="mr-4 bg-green-100 text-green-700 hover:bg-green-200"
            >
              <Check className="h-4 w-4 mr-2" />
              Aufgabe abschließen
            </Button>
          )}
          <TaskStatusBadge status={task.status || 'new'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 px-4 py-8">
          {/* Left Column */}
          <div className="flex flex-col gap-5">
            <Card className="rounded-xl shadow-md border-none bg-white/85">
              <CardContent className="p-6 pb-3 space-y-2">
                <h2 className="text-lg font-semibold mb-1">Aufgabendetails</h2>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Inbox className="h-4 w-4" />
                  <span className="font-medium">Beschreibung</span>
                </div>
                <div className="ml-6 text-gray-700 whitespace-pre-wrap break-words">{task.description}</div>


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
  {task.creator?.["Full Name"]
    || (task.source === 'email' && task.from_email)
    || <span className="text-gray-400">Unbekannt</span>}
</div>




                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">Zugewiesen an</span>
                </div>
                <div className="ml-6">{task.assignee?.["Full Name"] || 'Nicht zugewiesen'}</div>

                
              </CardContent>
            </Card>

            {renderArticlePreview(knowledgeArticle)}

            <KnowledgeArticleModal
              open={isArticleModalOpen}
              onClose={() => setIsArticleModalOpen(false)}
              article={knowledgeArticle}
            />
          </div>

          {/* Right Column (Conditionally Rendered) */}
          <div className="lg:col-span-2 flex w-full h-full min-h-[540px]">
            <div
              className="w-full h-full bg-gradient-to-br from-white via-blue-50/60 to-blue-100/50 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-between overflow-hidden mb-8 mr-6"
              style={{ padding: "1.5rem" }}
            >
              <CardHeader className="p-0 pb-2 flex flex-row items-center border-none">
                <CardTitle className="text-xl font-semibold text-blue-900">
                  {task.source === 'email' ? 'E-Mail Antwort' : 'Bearbeitung der Aufgabe'}
                </CardTitle>
              </CardHeader>

              {task.source === 'email' ? (
                <div className="flex-1 flex flex-col justify-start mt-4">
                  <textarea
                    rows={12}
                    placeholder="Antwort verfassen..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4 bg-white"
                  />
                  <Button className="w-fit bg-blue-600 hover:bg-blue-700 text-white self-start">
                    Senden
                  </Button>
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                  <TaskChat taskId={task.id} useCaseId={task.matched_use_case_id} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
