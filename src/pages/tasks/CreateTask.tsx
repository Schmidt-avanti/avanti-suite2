
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const CreateTask = () => {
  const [description, setDescription] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsMatching(true);
    try {
      // Match use case
      const { data: matchResult, error: matchError } = await supabase.functions
        .invoke('match-use-case', {
          body: { description },
        });

      if (matchError) throw matchError;

      // Create task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          description,
          title: description.split('\n')[0].slice(0, 100),
          created_by: user?.id,
          customer_id: user?.customer_id, // Assuming customer_id is in user metadata
          matched_use_case_id: matchResult.matched_use_case_id,
          match_confidence: matchResult.confidence,
          match_reasoning: matchResult.reasoning,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Add initial message
      await supabase
        .from('task_messages')
        .insert({
          task_id: task.id,
          content: description,
          role: 'user',
          created_by: user?.id,
        });

      toast({
        title: "Aufgabe erstellt",
        description: "Die Aufgabe wurde erfolgreich angelegt.",
      });

      navigate(`/tasks/${task.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Neue Aufgabe erstellen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreiben Sie die Aufgabe..."
                className="min-h-[200px]"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isMatching}>
                {isMatching ? "Analysiere..." : "Aufgabe erstellen"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTask;
