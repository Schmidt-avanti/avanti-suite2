
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { USE_CASE_TYPES, useCaseTypeLabels } from "@/types/use-case";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(1, "Titel wird benötigt"),
  type: z.enum([USE_CASE_TYPES.KNOWLEDGE_REQUEST, USE_CASE_TYPES.FORWARDING, USE_CASE_TYPES.DIRECT]),
  is_active: z.boolean(),
  information_needed: z.string().optional(),
  expected_result: z.string().optional(),
  steps: z.string().optional(),
  typical_activities: z.string().optional(),
});

interface UseCaseEditFormProps {
  useCase: any;
  onSuccess: () => void;
}

export function UseCaseEditForm({ useCase, onSuccess }: UseCaseEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: useCase.title,
      type: useCase.type,
      is_active: useCase.is_active,
      information_needed: useCase.information_needed || "",
      expected_result: useCase.expected_result || "",
      steps: useCase.steps || "",
      typical_activities: useCase.typical_activities || "",
    },
  });

  const updateUseCase = async (values: z.infer<typeof formSchema>) => {
    const { error } = await supabase
      .from("use_cases")
      .update(values)
      .eq("id", useCase.id);

    if (error) throw error;
    return values;
  };

  const mutation = useMutation({
    mutationFn: updateUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["use_case", useCase.id] });
      queryClient.invalidateQueries({ queryKey: ["use_cases"] });
      toast({
        title: "Erfolgreich gespeichert",
        description: "Der Use Case wurde aktualisiert.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Der Use Case konnte nicht gespeichert werden.",
        variant: "destructive",
      });
      console.error("Error updating use case:", error);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titel</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle einen Typ" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(USE_CASE_TYPES).map(([key, value]) => (
                    <SelectItem key={value} value={value}>
                      {useCaseTypeLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Aktiv</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="information_needed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Benötigte Informationen</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expected_result"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Erwartetes Ergebnis</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="steps"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Schritte</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="typical_activities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typische Aktivitäten</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="submit" className="bg-avanti-500 hover:bg-avanti-600">
            Speichern
          </Button>
        </div>
      </form>
    </Form>
  );
}
