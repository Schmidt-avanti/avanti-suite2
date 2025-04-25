// Everything before remains unchanged...

const onSubmit = async (values: TaskFormValues) => {
  if (!user) return;
  setIsMatching(true);
  try {
    let matchResult = null;

    try {
      const result = await supabase.functions.invoke('match-use-case', {
        body: { description: values.description },
      });
      if (result.error) throw result.error;
      matchResult = result.data;
    } catch (matchError) {
      console.warn("No use case matched:", matchError);
      toast({
        title: "Kein Use Case erkannt",
        description: "Die Aufgabe wird trotzdem erstellt und an KVP weitergeleitet.",
      });

      // Send notification to supervisors about unmatched task
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          message: `Neue Aufgabe ohne passenden Use Case erstellt. Beschreibung: ${values.description.substring(0, 100)}...`,
          user_id: user.id, // This will be filtered by RLS to only go to supervisors
        }]);

      if (notificationError) {
        console.error("Error creating supervisor notification:", notificationError);
      }
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        description: values.description,
        title: values.description.split('\n')[0].slice(0, 100) || 'Neue Aufgabe',
        created_by: user.id,
        customer_id: values.customerId,
        matched_use_case_id: matchResult?.matched_use_case_id || null,
        match_confidence: matchResult?.confidence || null,
        match_reasoning: matchResult?.reasoning || "Kein Use Case automatisch erkannt.",
        status: 'new',
        source: 'manual',
        forwarded_to: matchResult?.matched_use_case_id ? null : 'KVP'
      })
      .select()
      .single();

    if (taskError) throw taskError;

    const { error: messageError } = await supabase
      .from('task_messages')
      .insert({
        task_id: task.id,
        content: values.description,
        role: 'user',
        created_by: user.id,
      });

    if (messageError) throw messageError;

    await logTaskOpen(task.id);

    toast({
      title: "Aufgabe erstellt",
      description: matchResult?.matched_use_case_id
        ? "Aufgabe mit Use Case erstellt."
        : "Aufgabe ohne Use Case erstellt – KVP benachrichtigt.",
    });

    navigate(`/tasks/${task.id}`);

  } catch (error: any) {
    console.error("Submit error:", error);
    toast({
      variant: "destructive",
      title: "Fehler",
      description: error.message,
    });
  } finally {
    setIsMatching(false);
  }
};
