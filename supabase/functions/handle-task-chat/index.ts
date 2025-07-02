// @deno-types="https://esm.sh/v131/@supabase/functions-js@2.39.8/dist/module/index.d.ts"
// Deno-types für das http/server-Modul werden zur Laufzeit geladen
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// xhr wird in Deno nicht benötigt, weil Fetch API nativ unterstützt wird
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const sanitizeForTemplateLiteral = (str: string | undefined | null): string => {
  if (str === undefined || str === null) return '';
  // Escape backticks and ${ sequences
  return str.replace(/`/g, '\\`').replace(/\${/g, '\\${');
};

interface RequestBody {
  taskId: string;
  useCaseId?: string;
  message?: string;
  buttonChoice?: string;
  previousResponseId?: string;
  selectedOptions?: string[];
  isAutoInitialization?: boolean;
  generate_summary_on_demand?: boolean;
  generate_email_content?: boolean; // Option zum Generieren von E-Mail-Inhalt
  response_id?: string; // OpenAI Responses API ID für Konversationskontext
  user_display_name?: string; // Name des Benutzers für Personalisierung
}

interface TaskMessageFromDB {
  id: string; 
  task_id: string;
  role: 'user' | 'assistant' | 'agent' | 'system' | string; 
  content: string | Record<string, any> | any[]; 
  created_at: string;
  response_id?: string; // OpenAI Responses API ID 
  // Add any other relevant fields if known
}

interface EndkundeContact {
  contact_type?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Funktion zum Deduplizieren von Nachrichten
function deduplicate(messages: TaskMessageFromDB[]): TaskMessageFromDB[] {
  if (!messages) return [];
  const uniqueMessages: TaskMessageFromDB[] = [];
  const seen = new Set<string>();

  for (const message of messages) {
    const identifier = `${message.role}-${message.content}`;
    if (!seen.has(identifier)) {
      uniqueMessages.push(message);
      seen.add(identifier);
    }
  }
  return uniqueMessages;
}

function formatAssistantResponse(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.text) {
      return content; 
    }
  } catch (e) { /* ignore */ }

  try {
    const optionsPattern = /\[(.*?)\]/g;
    const matches = content.match(optionsPattern);
    if (matches && matches.length > 0) {
      const optionsText = matches[0];
      const optionsList = optionsText
        .replace(/[\[\]"]/g, '')
        .split(',')
        .map(option => option.trim());
      return JSON.stringify({
        text: content,
        options: optionsList
      });
    }
  } catch (e) { /* ignore */ }

  if (content.toLowerCase().includes('schlüssel') && 
      (content.toLowerCase().includes('verloren') || content.toLowerCase().includes('art von schlüssel'))) {
    return JSON.stringify({
      text: content,
      options: ["Hausschlüssel", "Wohnungsschlüssel", "Briefkastenschlüssel"]
    });
  }

  return JSON.stringify({
    text: content,
    options: []
  });
}

serve(async (req: Request): Promise<Response> => {
  console.log("%%%%%%% TEST-LOG: NEUE FUNKTIONSVERSION GELADEN (mit On-Demand-Summary) %%%%%%%");
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Den Request-Body nur einmal lesen
  let reqBody: RequestBody;
  let user_display_name: string | undefined = undefined;
  
  try {
    // Request-Body nur EINMAL parsen
    reqBody = await req.json() as RequestBody;
    // user_display_name aus dem Request extrahieren
    user_display_name = reqBody.user_display_name;
    
    // Die benötigten Felder aus reqBody extrahieren
    const { 
      taskId, 
      useCaseId, 
      message, 
      buttonChoice, 
      previousResponseId, 
      selectedOptions = [], 
      isAutoInitialization = false, 
      generate_summary_on_demand = false,
      generate_email_content = false 
    } = reqBody;

    console.log("Request received:", { 
      taskId, 
      useCaseId, 
      message: message ? "provided" : "empty", 
      buttonChoice,
      isAutoInitialization,
      generate_summary_on_demand,
      generate_email_content
    });

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: messagesFromDB, error: messagesError } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;
    
    // Dedupliziere Nachrichten, die innerhalb von 3 Sekunden mit gleichem Inhalt gesendet wurden
    // Dies entfernt die lästigen Duplikate, die durch Fehler im Frontend entstanden sind
    const deduplicatedMessages = messagesFromDB ? deduplicate(messagesFromDB) : null;
    console.log(`Dedupliziert: ${messagesFromDB?.length || 0} -> ${deduplicatedMessages?.length || 0} Nachrichten`);
    
    const typedMessages: TaskMessageFromDB[] | null = deduplicatedMessages;

    // Variablen für den gesamten Request-Scope
    let conversationMessages: { role: "system" | "user" | "assistant"; content: string; }[] = [];
    let systemPrompt = "";
    let taskData: { readable_id?: string; title?: string } | null = null;

    let responseSchema: any; // Wird dynamisch gesetzt

    if (generate_email_content) {
      console.log("E-Mail-Generierung angefordert für Task ID", taskId);

      const { data: taskForEmail, error: taskForEmailError } = await supabase
        .from('tasks')
        .select('readable_id, title, endkunde_id, matched_use_case_id')
        .eq('id', taskId)
        .single();

      if (taskForEmailError) {
        console.error("Error fetching task data for email:", taskForEmailError);
        throw new Error('Error fetching task data for email generation');
      }
      taskData = taskForEmail;

      // 1. Use Case laden
      let useCaseEmail = "";
      if (taskForEmail.matched_use_case_id) {
        const { data: useCase, error: useCaseError } = await supabase
          .from('use_cases')
          .select('process_map, info_block')
          .eq('id', taskForEmail.matched_use_case_id)
          .single();
        if (!useCaseError && useCase) {
          // 1a. process_map durchsuchen
          if (useCase.process_map) {
            try {
              const processMap = typeof useCase.process_map === 'string' ? JSON.parse(useCase.process_map) : useCase.process_map;
              // Suche nach E-Mail in jedem Schritt
              if (Array.isArray(processMap)) {
                for (const step of processMap) {
                  if (step && typeof step === 'object') {
                    if (step.email && typeof step.email === 'string' && step.email.includes('@')) {
                      useCaseEmail = step.email;
                      break;
                    }
                    // Suche nach E-Mail in beliebigen Feldern
                    for (const val of Object.values(step)) {
                      if (typeof val === 'string' && val.includes('@') && val.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
                        useCaseEmail = val;
                        break;
                      }
                    }
                  }
                  if (useCaseEmail) break;
                }
              }
            } catch (e) { /* ignore */ }
          }
          // 1b. info_block nach E-Mail durchsuchen
          if (!useCaseEmail && useCase.info_block && typeof useCase.info_block === 'string') {
            const match = useCase.info_block.match(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/);
            if (match) {
              useCaseEmail = match[1];
            }
          }
        }
      }

      // 2. endkunden-contacts
      let contactEmailFromDB = "";
      if (!useCaseEmail && taskForEmail.endkunde_id) {
        const { data: endkundenContacts, error: endkundenError } = await supabase
          .from('endkunde_contacts')
          .select('email')
          .eq('endkunde_id', taskForEmail.endkunde_id);

        if (!endkundenError && endkundenContacts && endkundenContacts.length > 0) {
          const emailContact = (endkundenContacts as any[]).find((c: any) => c.email && c.email.includes('@'));
          if (emailContact) {
            contactEmailFromDB = emailContact.email;
          }
        }
      }

      // 3. Chatverlauf nach E-Mail durchsuchen
      let chatEmail = "";
      if (!useCaseEmail && !contactEmailFromDB && typedMessages) {
        for (const msg of typedMessages) {
          if (typeof msg.content === 'string') {
            const match = msg.content.match(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/);
            if (match) {
              chatEmail = match[1];
              break;
            }
          }
        }
      }

      // 4. Auswahl der E-Mail-Adresse
      const finalRecipient = useCaseEmail || contactEmailFromDB || chatEmail || "";

      // Betreff
      const subject = `avanti-Anfrage zu Aufgabe #${(taskData as any)?.readable_id || ''}`;

      // Zusammenfassung des Chatverlaufs (vereinfacht: alle User- und Assistant-Nachrichten)
      let chatSummary = '';
      if (typedMessages) {
        chatSummary = typedMessages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
          .join('\n');
      }
      // Handlungsaufforderung am Ende (letzte Assistant-Nachricht mit "Bitte" oder "Handlung")
      let actionLine = '';
      if (typedMessages) {
        const lastAssistant = [...typedMessages].reverse().find(m => m.role === 'assistant' && typeof m.content === 'string' && (m.content.includes('Bitte') || m.content.toLowerCase().includes('handeln')));
        if (lastAssistant) {
          actionLine = '\n\nHandlungsaufforderung: ' + lastAssistant.content;
        }
      }
      const body = chatSummary + actionLine;

      // --- NEU: Zusammenfassung für E-Mail generieren ---
      let summaryText = '';
      try {
        // Systemprompt für die Zusammenfassung
        const summaryPrompt = `Fasse den bisherigen Verlauf des Vorgangs für eine E-Mail an einen externen Dienstleister oder Kunden zusammen. Die Zusammenfassung soll alle wichtigen Informationen enthalten, die für die Bearbeitung des Anliegens notwendig sind. Verwende einen sachlichen, professionellen Stil. Verzichte auf interne Systemanweisungen oder JSON-Objekte. Wenn eine Handlungsaufforderung aus dem Verlauf hervorgeht, formuliere diese am Ende der Zusammenfassung als klaren Satz.`;
        // Chatverlauf als Kontext
        let conversationForSummary = [];
        if (typedMessages) {
          conversationForSummary = typedMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)));
        }
        // OpenAI-Call für Zusammenfassung
        const summaryApiRequestBody = {
          model: "gpt-4.1-2025-04-14",
          temperature: 0.2,
          input: conversationForSummary.join('\n'),
          instructions: summaryPrompt,
          text: {
            format: {
              type: "text"
            }
          }
        };
        const summaryResponse = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(summaryApiRequestBody),
        });
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          // Extrahiere den Text
          if (summaryData.output && summaryData.output.length > 0) {
            const messageOutput = summaryData.output.find((o: any) => o.type === 'message');
            if (messageOutput && messageOutput.content) {
              const textContent = messageOutput.content.find((c: any) => c.type === 'output_text');
              if (textContent && textContent.text) {
                summaryText = textContent.text;
              }
            }
          }
        }
        if (!summaryText) summaryText = 'Zusammenfassung konnte nicht generiert werden.';
      } catch (e) {
        summaryText = 'Zusammenfassung konnte nicht generiert werden.';
      }
      // --- ENDE NEU ---

      // Response-Objekt
      const responseData = {
        content: JSON.stringify({
          email_to: finalRecipient,
          email_cc: '',
          email_subject: subject,
          email_body: summaryText,
        })
      };
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (generate_summary_on_demand) {
      systemPrompt = `Du bist Ava, eine KI-Assistentin. Deine Aufgabe ist es, den bisherigen Chat-Verlauf prägnant zusammenzufassen. Gib NUR die Zusammenfassung als Text zurück. Deine Antwort MUSS ein valides JSON-Objekt sein, das nur ein Feld "summary_text" enthält, z.B. { "summary_text": "Deine Zusammenfassung hier." }`;
      
      responseSchema = {
        type: "object",
        properties: {
          summary_text: { type: "string" },
        },
        required: ["summary_text"],
      };
    } else {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*, customer:customers(*), endkunde:endkunden(*)')
        .eq('id', taskId)
        .single();
      if (taskError) throw taskError;
      if (!task) return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 });

      let useCase = null;
      if (useCaseId) {
        const { data: ucData, error: ucError } = await supabase.from('use_cases').select('*').eq('id', useCaseId).single();
        if (ucError) {
          console.warn("Error fetching use case:", ucError.message);
        } else {
          useCase = ucData;
          
          // Prüfen ob der info_block im Use Case benötigt wird aber nicht vorhanden ist
          if (useCase && useCase.steps && Array.isArray(useCase.steps) && 
              useCase.steps.some((step: any) => typeof step === 'string' && step.includes('info_block')) && 
              !useCase.info_block) {
            
            // Für den Use Case "Zahlungsziel bei Rechnungen nach Abnahme"
            if (useCase.title === "Zahlungsziel bei Rechnungen nach Abnahme") {
              console.log("INFO: Füge Standard-info_block für 'Zahlungsziel bei Rechnungen nach Abnahme' hinzu.");
              useCase.info_block = "Das Zahlungsziel für ausgestellte Rechnungen beträgt in der Regel 14 Tage. Die Frist beginnt mit dem Tag der Abnahme bzw. der Rechnungsstellung zu laufen.";
            }
          }
        }
      }
      
      let endkundeData = null;
      if (task.endkunde_id) {
        const { data: ekData, error: ekError } = await supabase.from('endkunden').select('*').eq('id', task.endkunde_id).single();
        if (ekError) console.warn("Error fetching endkunde data:", ekError.message); else endkundeData = ekData;
      }

      let endkundeContactsData = null;
      if (task.endkunde_id) {
        const { data: ekContactsData, error: ekContactsError } = await supabase.from('endkunde_contacts').select('*').eq('endkunde_id', task.endkunde_id);
        if (ekContactsError) console.warn("Error fetching endkunde contacts:", ekContactsError.message); else endkundeContactsData = ekContactsData;
      }

      systemPrompt = `!!!! GRUNDREGELN FÜR DEINE ROLLE ALS AVA, KI-ASSISTENTIN FÜR KUNDENDIENST-AGENTEN !!!!
Du bist Ava, eine hochentwickelte KI-Assistentin, spezialisiert auf die Unterstützung von Kundendienst-Agenten in einem technischen Service-Unternehmen. Deine Hauptaufgabe ist es, den Agenten durch vordefinierte Use Cases zu führen, um Kundenanliegen effizient und korrekt zu bearbeiten. Du agierst als Werkzeug für den Agenten und sprichst den Agenten direkt an (z.B. "Bitte frage den Kunden..."). Du sprichst NICHT direkt mit dem Endkunden.

Deine Antwort MUSS IMMER ein valides JSON-Objekt sein, das exakt dem von der API vorgegebenen Schema entspricht. Gib NUR das JSON-Objekt zurück, ohne zusätzliche Erklärungen oder Formatierungen wie Markdown.

VERHALTENSREGELN:

0. **WICHTIG: Buttons/Optionen – HARTE REGEL!**
Buttons/Optionen (im Feld "options" oder "actions") dürfen NUR angeboten werden, wenn die Antwort aus einer festen Auswahl besteht (z.B. Ja/Nein, Liste) ODER wenn der Agent eine konkrete Handlung ausführen und bestätigen soll (z.B. "Erledigt", "E-Mail gesendet").

**ERLAUBTE Beispiele:**
- { "text": "Stimmen Name und Adresse überein?", "options": ["Ja", "Nein"] }
- { "text": "Welchen Schlüssel hat der Kunde verloren?", "options": ["Haustürschlüssel", "Wohnungsschlüssel", "Kellerschlüssel"] }
- { "text": "Bitte sende jetzt die E-Mail.", "options": ["E-Mail gesendet"] }
- { "text": "Vorgang abgeschlossen.", "options": ["Erledigt"] }

**VERBOTENE Beispiele:**
- { "text": "Bitte frage den Kunden nach dem Grund...", "options": ["Grund wurde erfasst"] }
- { "text": "Bitte frage nach dem Datum...", "options": ["Datum wurde erfasst"] }
- { "text": "Bitte frage nach der IBAN...", "options": ["IBAN wurde erfasst"] }
- { "text": "Bitte frage nach dem Namen...", "options": ["Name wurde erfasst"] }

Bei offenen Fragen, bei denen der Agent eine Information vom Kunden einholen oder eingeben muss (z.B. Grund, Datum, Name, Adresse, IBAN, individuelle Angaben), darf KEIN Bestätigungs- oder Erfassungs-Button (wie "wurde erfasst", "habe gefragt", "erledigt") angeboten werden. In diesen Fällen MUSS der Agent die Information als Freitext eingeben.

1.  **Use Case Führung**: Konzentriere dich darauf, den Agenten durch die Schritte des aktuellen Use Cases zu leiten. Frage die im Use Case definierten 'information_needed' ab.
2.  **Präzise Anweisungen**: Gib klare und unmissverständliche Anweisungen.
3.  **Effizienz**: Vermeide unnötige Fragen oder Wiederholungen. Wenn Informationen bereits aus dem Kontext (z.B. vorherige Nachrichten, Endkundendaten) bekannt sind, nutze sie.
4.  **Abschluss erkennen (propose_completion)**: Dies ist eine Kernfunktion. Wenn du basierend auf dem Use Case ('expected_result', 'steps') und dem Chatverlauf der Meinung bist, dass das Kundenanliegen vollständig bearbeitet wurde und alle notwendigen Informationen gesammelt wurden, SETZE action="propose_completion" UND liefere einen "summary_draft". Bedingungen für "propose_completion":
    *   Alle als 'information_needed' im Use Case definierten Informationen wurden abgefragt und plausible Antworten erhalten.
    *   Das 'expected_result' des Use Cases scheint erreicht.
    *   Die wesentlichen 'steps' des Use Cases wurden durchlaufen.
    *   Der Kunde hat keine weiteren offenen Fragen zum aktuellen Problem.
    *   Formuliere den "summary_draft" Problem- und Lösungsorientiert.

    **WICHTIG: Wenn das Anliegen abgeschlossen ist, MUSST du "action": "propose_completion" setzen und einen passenden "summary_draft" liefern.**
    
    Beispiel für eine Abschluss-Antwort:
    /*
    {
      "text": "Das Anliegen ist vollständig bearbeitet. Du kannst den Vorgang jetzt abschließen.",
      "options": [],
      "action": "propose_completion",
      "summary_draft": "Kunde hat alle erforderlichen Unterlagen eingereicht. Vorgang kann abgeschlossen werden."
    }
    */
5.  **Kontextnutzung**: Berücksichtige den gesamten bisherigen Chatverlauf und die bereitgestellten Stammdaten (Endkunde, Use Case). Beziehe dich ggf. auf frühere Antworten.
6.  **JSON-Format**: Halte dich strikt an das vorgegebene JSON-Format für deine Antworten. JEDE Antwort muss dieses Format haben.
7.  **Keine direkte Kundenansprache**: Du kommunizierst NUR mit dem Agenten.
8.  **Umgang mit Unklarheiten**: Wenn eine Eingabe des Agenten unklar ist, setze action="clarification_needed" und bitte um Präzisierung.
9.  **Keine Halluzinationen**: Erfinde keine Informationen oder Use Case Schritte.
10. **Anpassung an den Agenten**: Deine Antworten sollten so formuliert sein, dass sie dem Agenten helfen, professionell und effizient mit dem Endkunden zu interagieren.
11. **Informationsabgleich**: Vergleiche die vom Agenten erhaltenen Informationen mit den 'information_needed' und dem 'expected_result' des Use Cases. Wenn Abweichungen auftreten oder Informationen fehlen, frage gezielt nach.
12. **Prozesslandkarte nutzen**: Wenn 'useCase.process_map' vorhanden ist, nutze diese strukturierte Information, um die Reihenfolge und Logik der Schritte besser zu verstehen und den Agenten entsprechend zu führen. Die Prozesslandkarte kann dir helfen, Abhängigkeiten zwischen Schritten zu erkennen.
13. **ABSOLUT KEINE HALLUZINATIONEN**: Wenn du zu einem Punkt des Use Cases KEINE ausreichenden Informationen hast, dann ERFINDE NICHTS. Gib explizit an, dass du keine detaillierten Informationen zu diesem spezifischen Punkt hast und entweder:
    a) Bitte den Agenten um weitere Informationen mit action="clarification_needed" oder
    b) Verweise den Agenten an eine menschliche Führungskraft mit action="human_handoff_suggested".
14. **ZWEIFEL OFFEN ÄUSSERN**: Wenn eine Anfrage des Agenten außerhalb des definierten Use Case-Rahmens liegt oder wenn du nicht sicher bist, ob deine Antwort korrekt ist, ÄUSSERE diese Zweifel explizit und klar. Weise darauf hin, dass die Frage möglicherweise besser von einem menschlichen Mitarbeiter beantwortet werden sollte.
15. **STRENGE ADHERENZ ZUM USE CASE**: Fokussiere dich ausschließlich auf die im Use Case definierten Informationen. Wenn bestimmte Informationen nicht im Use Case enthalten sind, sage deutlich, dass diese Informationen nicht im definierten Use Case enthalten sind.
16. **KEINE TECH-BEGRIFFE**: Verwende NIEMALS technische Begriffe wie 'info_block', 'useCase', 'steps' oder andere interne Bezeichnungen in deinen Antworten. Gib die Information direkt und natürlich wieder, ohne auf ihre Quelle im System zu verweisen.
17. **Abschluss-Logik (propose_completion NUR nach Bestätigung):** Wenn alle Informationen gesammelt sind und eine finale Handlungsanweisung (z.B. E-Mail senden, Kunde informieren) erforderlich ist, gib diese Handlungsanweisung IMMER zuerst als eigene Antwort mit "action": "next_step" aus. Erst nachdem der Agent diese Handlung bestätigt hat (z.B. per Button "Erledigt"), setze im darauffolgenden Schritt "action": "propose_completion" und liefere die Zusammenfassung. Gib NIEMALS im selben Schritt die finale Handlungsanweisung UND "propose_completion" zurück.

BEISPIEL FÜR KORREKTE ANTWORTEN:

// Frage mit Ja/Nein
{ "text": "Stimmen Name und Adresse mit den gespeicherten Daten überein?", "options": ["Ja", "Nein"] }

// Auswahlfrage
{ "text": "Welchen Schlüssel hat der Kunde verloren?", "options": ["Haustürschlüssel", "Wohnungsschlüssel", "Kellerschlüssel"] }

// Klare Anweisung
{ "text": "Bitte gib dem Kunden nun die E-Mail-Adresse support@example.com bekannt.", "options": [] }

0a. **E-Mail-Button (HARTE REGEL!):**
Ein Button mit der Aufschrift "E-Mail senden" darf NUR dann im Feld options oder actions erscheinen, wenn der Agent an dieser Stelle tatsächlich eine E-Mail direkt aus dem Dialog heraus versenden soll.

**WICHTIG:** Immer wenn im Text eine E-Mail-Adresse vorkommt und der Agent eine Nachricht, Information oder Dokumente an diese Adresse senden oder weiterleiten soll, MUSST du im Feld options oder actions die Option "E-Mail senden" setzen. "Erledigt" ist nur für allgemeine Bestätigungen, NICHT für E-Mail-Aktionen.

**ERLAUBTES Beispiel:**
{
  "text": "Leite die Anfrage zur Versendung der Mietbestätigung an l.musliu@ja-dialog.de weiter.",
  "options": ["E-Mail senden"]
}

**VERBOTENE Beispiele:**
- { "text": "Bitte frage den Kunden nach seiner E-Mail-Adresse.", "options": ["E-Mail senden"] }
- { "text": "Bitte frage nach der IBAN.", "options": ["E-Mail senden"] }
- { "text": "Bitte frage nach dem Grund.", "options": ["E-Mail senden"] }
- { "text": "Bitte frage nach dem Datum.", "options": ["E-Mail senden"] }

WICHTIG: Der Button "E-Mail senden" ist ausschließlich für den tatsächlichen Versand einer E-Mail vorgesehen. Bei Informationsabfragen (z.B. nach E-Mail-Adresse, IBAN, Name, Grund, Datum) darf KEIN E-Mail-Button erscheinen, sondern es MUSS ein Freitextfeld erwartet werden.

`;

      if (endkundeData) {
        systemPrompt += `

KONTEXT: ENDKUNDENDATEN SIND IM SYSTEM VORHANDEN.
Diese Daten sind für Dich (den Agenten) als Hintergrundinformation gedacht:
- Vorname: ${sanitizeForTemplateLiteral(endkundeData.Vorname)}
- Nachname: ${sanitizeForTemplateLiteral(endkundeData.Nachname)}
- Adresse: ${sanitizeForTemplateLiteral(endkundeData.Adresse)}
Nutze diese Informationen aktiv. Wenn Vorname, Nachname und Adresse des Endkunden bereits bekannt sind, stelle **keine** erneuten Fragen nach diesen spezifischen Daten, es sei denn, der aktuelle Use Case Schritt erfordert explizit eine Verifizierung oder die Klärung einer Abweichung. Diese Daten sollen NICHT direkt von Dir (Ava) dem Kunden genannt werden. Sie dienen Dir (dem Agenten) zur Orientierung und zur Formulierung von Bestätigungsfragen.` + 
        (endkundeContactsData && endkundeContactsData.length > 0 ? `

ZUSÄTZLICHE KONTAKTINFORMATIONEN SIND VERFÜGBAR:
${endkundeContactsData.map((contact: EndkundeContact) => `- ${sanitizeForTemplateLiteral(contact.contact_type || 'Kontakt')}: ${sanitizeForTemplateLiteral(contact.name || '')} (${sanitizeForTemplateLiteral(contact.phone || '')} / ${sanitizeForTemplateLiteral(contact.email || '')})`).join('\n')}
Prüfe zuerst, ob diese Kontakte für den aktuellen Schritt relevant sind (z.B. wenn der Agent nach 'Hausmeister' fragt und ein Hausmeister-Kontakt vorhanden ist), bevor Du generische Anweisungen gibst oder nach diesen Informationen fragst.` : '');
      }
      systemPrompt += `

ARBEITEN MIT USE CASE SCHRITTEN:
Der aktuelle Use Case ist:
- Titel: ${useCase?.title || 'Unbekanntes Anliegen'}
- Typ: ${useCase?.type || 'Unbekannt'}
- Benötigte Informationen vom Kunden laut Use Case ('information_needed'): ${useCase?.information_needed || 'Keine spezifischen Informationen explizit als "benötigt" definiert.'}
- Erwartetes Ergebnis laut Use Case ('expected_result'): ${useCase?.expected_result || 'Kein spezifisches erwartetes Ergebnis definiert. Konzentriere dich auf die Abarbeitung der Schritte.'}
- Vorgegebene Schritte im Use Case ('useCase.steps'): ${useCase?.steps || 'Keine spezifischen Schritte definiert.'}
${useCase?.process_map ? `- Prozessschritte gemäß Prozesslandkarte ('useCase.process_map'):\n${JSON.stringify(useCase.process_map, null, 2)}` : ''}
${(useCase?.info_block || (useCase?.chat_response && useCase?.chat_response.info_block)) ? `

WICHTIGE INFORMATIONEN:
${useCase.info_block || useCase.chat_response.info_block}` : ''}
${useCase?.additional_notes ? `

ZUSÄTZLICHE HINWEISE:
${useCase.additional_notes}` : ''}
${useCase?.system_instructions ? `

SPEZIFISCHE SYSTEM-ANWEISUNGEN:
${useCase.system_instructions}` : ''}

Führe den Agenten durch die notwendigen Schritte. Wenn alle Informationen gesammelt sind und das 'expected_result' erreicht ist, schlage den Abschluss vor (action: "propose_completion").
ERINNERE DICH AN DAS ZWINGENDE JSON-FORMAT FÜR JEDE ANTWORT: { "text": "Deine Anweisung...", "options": [...] }.`;

      conversationMessages.push({ role: "system", content: systemPrompt });

      // Lade nur existierende Nachrichten aus der Datenbank
      if (typedMessages) {
        typedMessages.forEach((msg: TaskMessageFromDB) => {
          const messageContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          conversationMessages.push({ role: msg.role as "user" | "assistant", content: messageContent });
        });
      }

      // Speichere ALLE User-Nachrichten (Button & Freitext, nicht nur initial) als eigene Nachricht in task_messages
      // ENTFERNT: User-Nachrichten werden jetzt nur noch im Frontend gespeichert!
      // if (!isAutoInitialization && (message || buttonChoice)) {
      //   ...
      // }
    }

    console.log("Calling OpenAI with model: gpt-4.1-2025-04-14, Mode:", generate_summary_on_demand ? "On-Demand Summary" : "Chat");

    // Ermitteln der vorherigen Response ID für den Konversationskontext direkt aus der tasks-Tabelle
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('openai_response_id')
      .eq('id', taskId)
      .single();
      
    let previousOpenAIResponseId = currentTask?.openai_response_id || null;
    console.log(`Retrieved previous OpenAI Response ID from tasks table: ${previousOpenAIResponseId}`);
    
    // DEBUG: Use Case Informationen direkt laden und loggen
    console.log("\n---------- USE CASE INFORMATIONEN ----------");
    console.log("Use Case ID:", useCaseId);
    
    // Direktes Laden des Use Cases für Debugging
    if (useCaseId) {
      const { data: directUseCase, error: directUseCaseError } = await supabase
        .from('use_cases')
        .select('*')
        .eq('id', useCaseId)
        .single();
      
      if (directUseCaseError) {
        console.error("Fehler beim direkten Laden des Use Cases:", directUseCaseError);
      } else if (directUseCase) {
        console.log("DIREKT GELADENER USE CASE:", JSON.stringify(directUseCase, null, 2));
        console.log("Use Case Titel:", directUseCase.title);
        console.log("Use Case Type:", directUseCase.type);
        console.log("info_block vorhanden:", directUseCase.info_block ? 'JA' : 'NEIN');
        if (directUseCase.info_block) {
          console.log("info_block Inhalt:", directUseCase.info_block);
        }
        console.log("additional_notes vorhanden:", directUseCase.additional_notes ? 'JA' : 'NEIN');
        console.log("steps:", directUseCase.steps);
      } else {
        console.log("WARNUNG: Kein Use Case mit ID", useCaseId, "gefunden!");
      }
    }
    
    console.log("---------- ENDE USE CASE INFORMATIONEN ----------\n");

    // Vorbereiten des Input-Texts für die Responses API
    // Wenn nur ein Button-Klick ohne Nachricht vorliegt, verwenden wir den Buttontext direkt
    // Grund: Wir müssen der API eine aktuelle Benutzereingabe senden, aber ohne sie dem Konversationsverlauf hinzuzufügen
    const inputText = message || (buttonChoice ? buttonChoice : "");

    // Sicherstellen, dass der Input für die API valide ist, besonders bei On-Demand-Zusammenfassungen
    let apiInput = inputText;
    if (generate_summary_on_demand) {
      apiInput = "Erstelle eine Zusammenfassung des bisherigen Verlaufs.";
    }

    // Direkter OpenAI API Aufruf via fetch
    console.log(`Calling OpenAI Responses API with structured output. PreviousResponseId: ${previousOpenAIResponseId}`);    
    // DEBUG: Vollständige Konversationsübersicht
    console.log("Conversation history length:", conversationMessages.length);    
    console.log("Last user message:", inputText);
    
    // DETAILLIERTES LOGGING: Vollständiger System-Prompt für Debugging
    console.log("\n---------- VOLLSTÄNDIGER SYSTEM PROMPT ----------");
    console.log(systemPrompt);
    console.log("---------- ENDE SYSTEM PROMPT ----------\n");

    const apiRequestBody = {
      model: "gpt-4.1-2025-04-14",
      temperature: 0.2,
      input: apiInput,
      previous_response_id: previousOpenAIResponseId,
      instructions: systemPrompt,
      text: {
        format: {
          type: "json_schema",
          name: "use_case_chat",
          schema: {
            type: "object",
            properties: {
              text: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              action: { type: "string", enum: ["next_step", "propose_completion", "clarification_needed", "human_handoff_suggested"] },
              summary_draft: { type: "string" },
              text_to_agent: { type: "string" },
              suggested_confirmation_text: { type: "string" }
            },
            required: ["text", "options", "action", "summary_draft", "text_to_agent", "suggested_confirmation_text"],
            additionalProperties: false
          }
        }
      }
      // temperature Parameter wird vom o4-mini-2025-04-16 Modell nicht unterstützt
      // temperature: 0.2
    };

    const fetchResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequestBody),
    });

    if (!fetchResponse.ok) {
      const errorBody = await fetchResponse.text();
      console.error('OpenAI API request failed:', fetchResponse.status, errorBody);
      throw new Error(`OpenAI API request failed with status ${fetchResponse.status}: ${errorBody}`);
    }

    const response = await fetchResponse.json();
    const openaiResponseId = response.id;

    console.log("OpenAI Responses API ID:", openaiResponseId);
    console.log("OpenAI Response Status:", response.status);
    // DETAILLIERTES LOGGING: Vollständiger API-Request-Body
    console.log("\n---------- VOLLSTÄNDIGER API-REQUEST-BODY ----------");
    console.log(JSON.stringify(apiRequestBody, null, 2));
    console.log("---------- ENDE API-REQUEST-BODY ----------\n");

    // Extrahieren des Antworttexts aus der Responses API Ausgabe
    let assistantResponseContent = '';
    if (response.output && response.output.length > 0) {
      const messageOutput = response.output.find((o: any) => o.type === 'message');
      if (messageOutput && messageOutput.content) {
        const textContent = messageOutput.content.find((c: any) => c.type === 'output_text');
        if (textContent && textContent.text) {
          assistantResponseContent = textContent.text;
        }
      }
    }
    console.log("Raw OpenAI Responses API content:", assistantResponseContent);

    if (!assistantResponseContent) {
      console.error("OpenAI response content is missing after API call.");
      throw new Error("OpenAI response content is missing.");
    }

    // Bereite die Antwort für den Client und die Datenbank vor
    let responseData: any = {
      content: "",
      messageId: null,
      previousMessageId: previousResponseId || null,
    };

    // Format response depending on whether it's a summary, email or regular chat request
    if (generate_email_content) {
      // Für E-Mail-Generierung
      try {
        const parsedOpenAIResponse = JSON.parse(assistantResponseContent);
        if (parsedOpenAIResponse && parsedOpenAIResponse.email_body) {
          // Return email content in the expected format
          // Speichere in responseData, nicht in responseToSendToClient (nicht existierende Variable)
          responseData.content = JSON.stringify({
            email_to: parsedOpenAIResponse.email_to || "",
            email_cc: parsedOpenAIResponse.email_cc || "",
            email_subject: parsedOpenAIResponse.email_subject || `Nachfrage zu Aufgabe #${taskData?.readable_id || ""}`,
            email_body: parsedOpenAIResponse.email_body,
          });
          console.log("Generated email content. Not saving to DB.");
        } else {
          throw new Error('OpenAI Response did not have the expected format for email content');
        }
      } catch (error) {
        console.error('Error processing email response from OpenAI:', error);
        responseData.content = JSON.stringify({
          text: "Es gab ein Problem beim Erstellen der E-Mail.",
          options: [],
        });
      }
      
      // Direkt Antwort zurücksenden ohne DB-Operationen für E-Mail
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (generate_summary_on_demand) {
      console.log("==== SUMMARY GENERATION STARTED ====");
      
      try {
        // Validiere API-Antwort
        let summaryText = '';
        
        // Versuche, die OpenAI-Antwort zu analysieren und Zusammenfassungstext zu extrahieren
        try {
          // Versuche die OpenAI-Antwort zu parsen
          const parsedResponse = JSON.parse(assistantResponseContent);
          if (parsedResponse && parsedResponse.summary_text) {
            summaryText = parsedResponse.summary_text;
            console.log('Zusammenfassungstext erfolgreich aus der OpenAI-Antwort extrahiert:', summaryText.slice(0, 50) + '...');
          } else if (parsedResponse && typeof parsedResponse.text === 'string') {
            // Fallback: Verwende den Text-Inhalt, falls summary_text nicht vorhanden ist
            summaryText = parsedResponse.text;
            console.log('Fallback: Verwende text-Feld als Zusammenfassung:', summaryText.slice(0, 50) + '...');
          } else {
            // Wenn weder summary_text noch text vorhanden sind, verwende den Rohtext
            summaryText = assistantResponseContent;
            console.log('Fallback: Verwende Rohtext als Zusammenfassung:', summaryText.slice(0, 50) + '...');
          }
        } catch (error) {
          // Bei Parsing-Fehlern nutzen wir die Rohausgabe als Text
          console.warn('Fehler beim Parsen der JSON-Antwort:', error instanceof Error ? error.message : String(error));
          summaryText = assistantResponseContent;
          console.log('Verwende Rohtext als Zusammenfassung nach Parsing-Fehler:', summaryText.slice(0, 50) + '...');
        }
        
        // KRITISCHES FORMAT: Frontend erwartet ein "response"-Feld
        // Das response-Feld muss einen JSON-String mit summary_text enthalten
        const finalResponse = {
          response: JSON.stringify({
            summary_text: summaryText,
            text_to_agent: '',
            options: []
          })
        };
        
        console.log("Korrekte Antwort-Struktur für Frontend:", JSON.stringify(finalResponse));
        console.log("Response ist ein JSON-String im 'response'-Feld:", typeof finalResponse.response === 'string');
        
        // Detailliertes Logging zur Fehlersuche
        console.log("Finale Antwort an das Frontend:", JSON.stringify(finalResponse));
        
        // Antwort zurücksenden
        return new Response(JSON.stringify(finalResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error in summary generation:', error);
        
        // Absoluter Fallback - extrem einfache Struktur
        const fallbackResponse = {
          content: {
            summary_text: "Einfache Fallback-Zusammenfassung für Testzwecke."
          }
        };
        
        return new Response(JSON.stringify(fallbackResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Regular chat interaction - parse and process OpenAI response
      try {
        const parsedOpenAIResponse = JSON.parse(assistantResponseContent);
        if (parsedOpenAIResponse.action === "propose_completion") {
          responseData.content = assistantResponseContent; // Send raw JSON for propose_completion
          console.log("Detected 'propose_completion' action from OpenAI.");
        } else {
          // Standard chat response (might be structured JSON or plain text that needs formatting)
          responseData.content = formatAssistantResponse(assistantResponseContent); // Format for client
        }
      } catch (e) {
        // Parsing failed, assume it's a standard string response from OpenAI that needs formatting
        console.error('Error parsing OpenAI response:', e);
        responseData.content = formatAssistantResponse(assistantResponseContent);
      }

      // --- Perform DB operations for regular chat --- 
      // Nur die Antwort des Assistenten speichern, keine User-Nachrichten!
      
      // Save assistant message to the database
      // WICHTIG: Angepasst an die tatsächliche Datenbankstruktur von task_messages
      const { data: insertedAssistantMsgArr, error: assistantInsertError } = await supabase
        .from('task_messages')
        .insert([
          {
            task_id: taskId,
            // Verwende role statt sender (basierend auf der DB-Struktur)
            role: 'assistant',
            content: typeof responseData.content === 'string' ? responseData.content : JSON.stringify(responseData.content),
            // previous_message_id statt responded_to_message_id
            previous_message_id: previousResponseId
            // Entfernte Felder: type, openai_response_id, button_choice, selected_options
          }
        ])
        .select();

      if (assistantInsertError) {
        console.error('Error saving assistant message to DB:', assistantInsertError);
      } else {
        console.log('Assistant message saved successfully to DB');
        
        // Get the id of the inserted assistant message
        const insertedAssistantMessageId = insertedAssistantMsgArr[0]?.id;
        if (insertedAssistantMessageId) {
          responseData.messageId = insertedAssistantMessageId;
          
          // Update task with last message info - angepasst an DB-Struktur
          const { error: taskUpdateError } = await supabase
            .from('tasks')
            .update({
              // Verwende last_message_at statt last_message_timestamp
              last_message_at: new Date().toISOString(),
              last_message_id: insertedAssistantMessageId,
              // Verwende openai_response_id statt last_openai_response_id
              openai_response_id: openaiResponseId
            })
            .eq('id', taskId);

          if (taskUpdateError) {
            console.error('Error updating task with last message info:', taskUpdateError);
          } else {
            console.log('Task updated successfully with last message and OpenAI response info');
          }
        } else {
          console.warn("No assistant message ID available.");
        }
      }
      // --- End of DB operations for regular chat ---
    }

    // Stellen wir sicher, dass wir für die Response eine lokale Variable haben
    const finalResponseData = {
      ...responseData,
      openai_response_id: openaiResponseId, // OpenAI Responses API ID für den Konversationskontext
    };
    
    // Füge die Nachricht-ID hinzu, wenn vorhanden
    if (responseData.messageId) {
      finalResponseData.response_id = responseData.messageId;
    }
    
    return new Response(
      JSON.stringify(finalResponseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handle-task-chat function:', error);
    let errorMessage = 'An unknown error occurred';
    let isRateLimitError = false;

    if (error instanceof Error) {
      errorMessage = error.message;
      isRateLimitError = error.message?.includes('rate limit');
    } else if (typeof error === 'string') {
      errorMessage = error;
      isRateLimitError = error.includes('rate limit');
    } else if (error && typeof error === 'object' && 'message' in error) {
      // Handle cases where error is an object with a message property but not an Error instance
      errorMessage = String(error.message);
      if (typeof error.message === 'string') {
        isRateLimitError = error.message.includes('rate limit');
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        is_rate_limit: isRateLimitError
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
