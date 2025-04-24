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
  const [isLoading, setIsLoading] = useState(true);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState('');
  const [replyBody, setReplyBody] = useState('');
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

      const [customer, creator, assignee] = await Promise.all([
        taskData.customer_id
          ? supabase.from('customers').select('name').eq('id', taskData.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        taskData.created_by
          ? supabase.from('profiles').select('id, "Full Name"').eq('id', taskData.created_by).maybeSingle()
          : Promise.resolve({ data: null }),
        taskData.assigned_to
          ? supabase.from('profiles').select('id, "Full Name"').eq('id', taskData.assigned_to).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const enrichedTask = {
        ...taskData,
        customer: customer.data,
        creator: creator.data,
        assignee: assignee.data
      };

      setTask(enrichedTask);
      setReplyTo(taskData.from_email || '');

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

  const handleSendEmail = async () => {
    if (!replyTo || !replyBody) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte Empfänger und Nachricht angeben.'
      });
      return;
    }

    const { error } = await supabase.functions.invoke('send-reply-email', {
      body: {
        to: replyTo,
        subject: `Re: ${task.subject || 'Ihre Anfrage'}`,
        body: replyBody,
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Senden',
        description: error.message,
      });
    } else {
      toast({
        title: 'E-Mail gesendet',
        description: `Antwort an ${replyTo} wurde gesendet.`,
      });
      setReplyBody('');
    }
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
              onClick={() => handleCompleteTask()}
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
          {/* Left Section omitted for brevity — keep as is from previous version */}

          {/* Right Section — Email Reply or Task Chat */}
          <div className="lg:col-span-2 flex w-full h-full min-h-[540px]">
            <div className="w-full h-full bg-gradient-to-br from-white via-blue-50/60 to-blue-100/50 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-between overflow-hidden mb-8 mr-6 p-6">
              <CardHeader className="p-0 pb-2 flex flex-row items-center border-none">
                <CardTitle className="text-xl font-semibold text-blue-900">
                  {task.source === 'email' ? 'E-Mail Antwort' : 'Bearbeitung der Aufgabe'}
                </CardTitle>
              </CardHeader>

              {task.source === 'email' ? (
                <div className="flex-1 flex flex-col justify-start mt-4">
                  <label className="text-sm text-muted-foreground mb-1 font-medium">Empfänger</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm mb-4 bg-white"
                  />

                  <textarea
                    rows={12}
                    placeholder="Antwort verfassen..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4 bg-white"
                  />
                  <Button
                    className="w-fit bg-blue-600 hover:bg-blue-700 text-white self-start"
                    onClick={handleSendEmail}
                  >
                    Senden
                  </Button>
                </div>
              ) : (
                <TaskChat taskId={task.id} useCaseId={task.matched_use_case_id} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
