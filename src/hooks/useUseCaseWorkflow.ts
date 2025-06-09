
import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface WorkflowDeviation {
  id: string;
  task_id: string;
  use_case_id: string;
  deviation_text: string;
  created_at: string;
  created_by: string | null;
}

export const useUseCaseWorkflow = (taskId: string) => {
  const [deviations, setDeviations] = useState<WorkflowDeviation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addDeviation = useCallback(async (useCaseId: string, deviationText: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('workflow_deviations')
        .insert({
          task_id: taskId,
          use_case_id: useCaseId,
          deviation_text: deviationText
        })
        .select()
        .single();

      if (error) throw error;

      setDeviations(prev => [...prev, data]);
      
      toast({
        title: "Abweichung gespeichert",
        description: "Die Abweichung wurde erfolgreich dokumentiert."
      });

      return data;
    } catch (error: any) {
      console.error('Error adding deviation:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Abweichung konnte nicht gespeichert werden."
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [taskId, toast]);

  const fetchDeviations = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('workflow_deviations')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeviations(data || []);
    } catch (error: any) {
      console.error('Error fetching deviations:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Abweichungen konnten nicht geladen werden."
      });
    } finally {
      setIsLoading(false);
    }
  }, [taskId, toast]);

  const saveWorkflowProgress = useCallback(async (useCaseId: string, workflowData: any) => {
    try {
      const { error } = await supabase
        .from('task_workflow_progress')
        .upsert({
          task_id: taskId,
          use_case_id: useCaseId,
          workflow_data: workflowData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Fortschritt gespeichert",
        description: "Der Workflow-Fortschritt wurde gespeichert."
      });
    } catch (error: any) {
      console.error('Error saving workflow progress:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fortschritt konnte nicht gespeichert werden."
      });
    }
  }, [taskId, toast]);

  return {
    deviations,
    isLoading,
    addDeviation,
    fetchDeviations,
    saveWorkflowProgress
  };
};
