const handleSendEmail = async () => {
  if (!replyTo || !replyBody) {
    toast({
      variant: 'destructive',
      title: 'Fehler',
      description: 'Bitte Empfänger und Nachricht angeben.'
    });
    return;
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    const { error } = await supabase.functions.invoke('send-reply-email', {
      body: {
        to: replyTo,
        subject: `Re: ${task.subject || 'Ihre Anfrage'}`,
        body: replyBody,
      },
      headers: {
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`
      }
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
  } catch (err) {
    toast({
      variant: 'destructive',
      title: 'Unbekannter Fehler',
      description: String(err),
    });
  }
};
