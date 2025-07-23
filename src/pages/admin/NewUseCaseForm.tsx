import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { Input } from "@/components/ui/input";
import ModernFlowEditor from "@/components/use-cases/ModernFlowEditor";
import { ReactFlowProvider } from '@xyflow/react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Bold as BoldIcon, Italic as ItalicIcon, List as ListIcon, ListOrdered as ListOrderedIcon, Heading as HeadingIcon, Link2 as LinkIcon, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon } from 'lucide-react';
import { BubbleMenu } from '@tiptap/react';
import { mergeAttributes } from '@tiptap/core';

const TYPE_OPTIONS = [
  { value: "knowledge_request", label: "Wissensanfrage" },
  { value: "forwarding_use_case", label: "Weiterleitung" },
  { value: "direct_use_case", label: "Direktbearbeitung" },
  { value: "other", label: "Sonstiges/Individuell" },
];

// Schritt-Typ für verschachtelte Baumstruktur
interface NewUseCaseFormProps {
  initialData?: any;
  editMode?: boolean;
}

interface Step {
  id: string;
  name: string;
  type: string;
  template: any;
  description?: string;
  children?: Step[];
  next?: string[]; // IDs der nächsten Schritte (für Verzweigungen)
}

// Hilfsfunktion zur Generierung der nächsten ID
function generateStepId(parentId: string | null, siblings: Step[]): string {
  if (!parentId) {
    // Top-Level: nächste freie Zahl
    const nums = siblings.map(s => parseInt(s.id)).filter(n => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return String(nextNum);
  } else {
    // Unter-Schritt: parentId + . + nächste freie Zahl
    const childNums = siblings.map(s => {
      const parts = s.id.split('.');
      return parseInt(parts[parts.length - 1]);
    }).filter(n => !isNaN(n));
    const nextNum = childNums.length > 0 ? Math.max(...childNums) + 1 : 1;
    return parentId + '.' + nextNum;
  }
}

// Hilfsfunktion: Nur relevante Felder für die DB speichern
function cleanNodesForDb(nodes: any[]): any[] {
  return nodes.map(n => {
    const d = n.data || {};
    return {
      id: n.id,
      type: d.type || n.type,
      label: d.label,
      description: d.description,
      fields: d.fields,
      options: d.options,
      actionType: d.actionType,
      actionCustom: d.actionCustom,
      hint: d.hint,
    };
  });
}

function cleanEdgesForDb(edges: any[]): any[] {
  return (edges || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || '',
  }));
}

// Hilfsfunktion: Positionen ergänzen
function addDefaultPositionsToNodes(nodes: any[]): any[] {
  let y = 200;
  return nodes.map((n, i) => {
    // Prüfe, ob n bereits ein data-Objekt hat (aus DB oder aus Editor)
    const isFlat = !n.data;
    const data = isFlat ? { ...n } : { ...n.data };
    // Immer type: 'custom' für React Flow
    return {
      id: n.id,
      type: 'custom',
      position: n.position || { x: 200 + i * 220, y },
      sourcePosition: n.sourcePosition || 'right',
      targetPosition: n.targetPosition || 'left',
      data,
    };
  });
}

// Toolbar-Komponente für TipTap
const MenuBar = ({ editor }) => {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-2 bg-slate-100 rounded-t-lg px-3 py-2 border-b border-slate-200 sticky top-0 z-10">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`} title="Fett"><BoldIcon size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`} title="Kursiv"><ItalicIcon size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded-md transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`} title="Überschrift"><HeadingIcon size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`} title="Liste"><ListIcon size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`} title="Nummerierte Liste"><ListOrderedIcon size={18} /></button>
      <button type="button" onClick={() => {
        const url = window.prompt('URL eingeben');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }} className="p-2 rounded-md transition-colors hover:bg-slate-200" title="Link einfügen"><LinkIcon size={18} /></button>
      <button type="button" onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          // 1. Bild in Supabase Storage hochladen
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('knowledge-images').upload(fileName, file, { upsert: false });
          if (uploadError) {
            alert('Fehler beim Hochladen des Bildes: ' + uploadError.message);
            return;
          }
          // 2. Öffentliche URL holen
          const { data } = supabase.storage.from('knowledge-images').getPublicUrl(fileName);
          const publicUrl = data?.publicUrl;
          if (!publicUrl) {
            alert('Fehler beim Ermitteln der Bild-URL');
            return;
          }
          // 3. Bild im Editor einfügen
          editor.chain().focus().setImage({ src: publicUrl }).run();
        };
        input.click();
      }} className="p-2 rounded-md transition-colors hover:bg-slate-200" title="Bild einfügen"><ImageIcon size={18} /></button>
      <button type="button" onClick={() => {
        // Bild zentrieren: setzt Textausrichtung auf 'center' für das aktuelle Bild
        const { state, view } = editor;
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        if (node && node.type.name === 'image') {
          editor.chain().focus().setNodeAttribute('image', 'class', 'mx-auto my-4 max-w-full rounded shadow block').setTextAlign('center').run();
        }
      }} className="p-2 rounded-md transition-colors hover:bg-slate-200" title="Bild zentrieren"><AlignCenter size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded-md transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`} title="Links ausrichten"><AlignLeft size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded-md transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`} title="Zentrieren"><AlignCenter size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-2 rounded-md transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`} title="Rechts ausrichten"><AlignRight size={18} /></button>
    </div>
  );
};

// Neue Komponente für einen Wissenseintrag
const TightListItem = ListItem.extend({
  content: 'text*',
  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(HTMLAttributes), 0];
  },
});

// Hilfsfunktion: Extrahiere Bild-Dateinamen aus Content
function extractImageFilenamesFromContent(content: string) {
  const regex = /https?:\/\/[^\s"']*knowledge-images\/([^\s"'>]+)/g;
  const filenames = [];
  let match;
  while ((match = regex.exec(content))) {
    filenames.push(match[1]);
  }
  return filenames;
}

// Bild-Cleanup beim Speichern
export async function cleanupUnusedImages(content: string) {
  // 1. Alle referenzierten Bild-Dateinamen im Content
  const referenced = extractImageFilenamesFromContent(content);
  // 2. Alle Bilder im Bucket listen (optional: nach Prefix filtern)
  const { data: allFiles, error } = await supabase.storage.from('knowledge-images').list('', { limit: 1000 });
  if (error) return;
  const toDelete = (allFiles?.filter(f => f.name.startsWith('knowledge-')) || [])
    .filter(f => !referenced.includes(f.name))
    .map(f => f.name);
  if (toDelete.length > 0) {
    await supabase.storage.from('knowledge-images').remove(toDelete);
  }
}

// Neue Komponente für einen Wissenseintrag
const KnowledgeEntry = ({ value, onChange, onDelete }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        listItem: false, // Deaktiviert Standard-ListItem
      }),
      Bold,
      Italic,
      Heading.configure({ levels: [2, 3] }),
      BulletList,
      OrderedList,
      TightListItem,
      Link,
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            class: {
              default: 'mx-auto my-2 block max-w-full rounded shadow',
              parseHTML: element => element.getAttribute('class'),
              renderHTML: attributes => {
                return {
                  class: attributes.class || 'mx-auto my-2 block max-w-full rounded shadow',
                };
              },
            },
          };
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
    ],
    content: value.content,
    onUpdate: ({ editor }) => {
      onChange({ ...value, content: editor.getHTML() });
    },
  });

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 mb-8">
      <input
        className="font-semibold text-base w-full border-0 border-b border-slate-200 rounded-t-xl px-5 pt-5 pb-3 focus:outline-none focus:ring-0"
        value={value.title}
        onChange={e => onChange({ ...value, title: e.target.value })}
        placeholder="Titel des Wissens (z. B. Kündigungsfrist)"
      />
      <MenuBar editor={editor} />
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          shouldShow={({ editor }) => {
            const { state } = editor;
            const { selection } = state;
            const node = state.doc.nodeAt(selection.from);
            return node && node.type.name === 'image';
          }}
        >
          <div className="flex gap-2 bg-white border border-slate-200 rounded shadow px-2 py-1">
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'block ml-0 mr-auto my-2 max-w-[200px] rounded shadow' }).run()} className="p-1 rounded hover:bg-slate-100" title="Links"><AlignLeft size={16} /></button>
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'block mx-auto my-2 max-w-[300px] rounded shadow' }).run()} className="p-1 rounded hover:bg-slate-100" title="Zentriert"><AlignCenter size={16} /></button>
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'block ml-auto mr-0 my-2 max-w-[200px] rounded shadow' }).run()} className="p-1 rounded hover:bg-slate-100" title="Rechts"><AlignRight size={16} /></button>
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'block mx-auto my-2 max-w-[120px] rounded shadow' }).run()} className="p-1 rounded hover:bg-slate-100" title="Klein">S</button>
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'block mx-auto my-2 max-w-[300px] rounded shadow' }).run()} className="p-1 rounded hover:bg-slate-100" title="Mittel">M</button>
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'block mx-auto my-2 max-w-full rounded shadow' }).run()} className="p-1 rounded hover:bg-slate-100" title="Groß">L</button>
          </div>
        </BubbleMenu>
      )}
      <div className="px-5 pb-6 pt-3">
        <EditorContent editor={editor} className="prose prose-sm min-h-[120px] bg-slate-50 rounded-lg p-4 border border-slate-200 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)] shadow-none prose-ul:my-1 prose-ol:my-1 prose-li:my-0" />
      </div>
      <button className="text-red-500 mt-2 ml-5 mb-5" onClick={onDelete}>Löschen</button>
    </div>
  );
};

export default function NewUseCaseForm({ initialData, editMode }: NewUseCaseFormProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Basisdaten, 2 = Prozess-Editor
  const [customers, setCustomers] = useState<{ id: string; name: string; industry?: string | null }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState(initialData?.title || "");
  const [type, setType] = useState(initialData?.type || "");
  const [tags, setTags] = useState<string>((initialData?.category || []).join(", ") || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [goal, setGoal] = useState(initialData?.goal || "");
  const [steps, setSteps] = useState<{ nodes: any[]; edges: any[] }>(() => {
    let stepsValue = initialData?.steps;
    if (typeof stepsValue === 'string') {
      try {
        stepsValue = JSON.parse(stepsValue);
      } catch (e) {
        stepsValue = { nodes: [], edges: [] };
      }
    }
    if (stepsValue && Array.isArray(stepsValue.nodes) && Array.isArray(stepsValue.edges)) {
      return stepsValue;
    }
    return { nodes: [], edges: [] };
  });
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepLibrary, setStepLibrary] = useState<any[]>([]);
  const [hasEndNode, setHasEndNode] = useState(false);
  const { toast } = useToast();

  // Wissen-Tab/-Panel
  const [knowledge, setKnowledge] = useState<Array<{ title: string; content: string }>>(initialData?.knowledge || []);

  // Setze customerId erst, wenn Kunden geladen und Wert vorhanden ist
  useEffect(() => {
    if (initialData?.customer_id && customers.length > 0) {
      const exists = customers.some(c => c.id === initialData.customer_id);
      if (exists) setCustomerId(initialData.customer_id);
    }
  }, [initialData, customers]);

  // Steps dynamisch nachladen, wenn initialData sich ändert (z. B. nach async fetch)
  useEffect(() => {
    let stepsValue = initialData?.steps;
    if (typeof stepsValue === 'string') {
      try {
        stepsValue = JSON.parse(stepsValue);
      } catch (e) {
        stepsValue = { nodes: [], edges: [] };
      }
    }
    if (stepsValue && Array.isArray(stepsValue.nodes) && Array.isArray(stepsValue.edges)) {
      setSteps(stepsValue);
    }
  }, [initialData?.steps]);

  useEffect(() => {
    fetchCustomers();
    fetchStepLibrary();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, industry")
      .order("name");
    if (!error && data) {
      setCustomers(data);
      if (data.length > 0) setCustomerId(data[0].id);
    }
  };

  const fetchStepLibrary = async () => {
    const { data, error } = await supabase
      .from("step_library")
      .select("id, name, type, template, description")
      .order("name");
    if (!error && data) {
      setStepLibrary(data.map((s) => ({ ...s, id: String(s.id) })));
    }
  };

  // Callback für ModernFlowEditor, um Steps zu übernehmen und auf Ende-Node zu prüfen
  const handleFlowChange = (flow: any) => {
    // Fallback: falls noch ein Array übergeben wird (Legacy), in Objekt umwandeln
    if (Array.isArray(flow)) {
      setSteps({ nodes: flow, edges: [] });
      setHasEndNode(flow.some(n => n.type === 'end' || n.data?.type === 'end'));
    } else {
      setSteps({ nodes: flow.nodes || [], edges: flow.edges || [] });
      setHasEndNode((flow.nodes || []).some((n: any) => n.type === 'end' || n.data?.type === 'end'));
    }
  };

  // Speicher-Handler für neuen Use Case
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!customerId || !title || !type || (steps?.nodes?.length ?? 0) === 0) {
        setError('Bitte alle Pflichtfelder ausfüllen und mindestens einen Schritt anlegen.');
        setSaving(false);
        return;
      }
      if (!hasEndNode) {
        setError('Der Flow muss mindestens einen "Ende"-Node enthalten, damit der Use Case abgeschlossen werden kann.');
        setSaving(false);
        return;
      }
      // Strenge Flow-Validierung: Jede Node (außer Start/Ende) muss mind. einen Eingang UND Ausgang haben
      // Debug-Ausgabe: Ein-/Ausgänge jeder Node loggen
      (steps?.nodes ?? []).forEach(node => {
        const incoming = (steps?.edges ?? []).filter(e => e.target === node.id).length;
        const outgoing = (steps?.edges ?? []).filter(e => e.source === node.id).length;
        console.log(`Node ${node.id} (${node.type}): Eingänge=${incoming}, Ausgänge=${outgoing}`);
      });
      for (const node of steps?.nodes ?? []) {
        const incoming = (steps?.edges ?? []).filter(e => e.target === node.id).length;
        const outgoing = (steps?.edges ?? []).filter(e => e.source === node.id).length;
        const nodeType = node.data?.type;
        if (nodeType === 'start') {
          if (outgoing === 0) {
            console.error('Start-Node-Fehler:', node, steps);
            setError('Der Start-Node muss mit mindestens einer Node verbunden sein.');
            setSaving(false);
            toast({ title: 'Fehler', description: 'Der Start-Node muss mit mindestens einer Node verbunden sein.', variant: 'destructive' });
            return;
          }
        } else if (nodeType === 'end') {
          if (incoming === 0) {
            console.error('End-Node-Fehler:', node, steps);
            setError('Ein Ende-Node muss mindestens einen eingehenden Pfad haben.');
            setSaving(false);
            toast({ title: 'Fehler', description: 'Ein Ende-Node muss mindestens einen eingehenden Pfad haben.', variant: 'destructive' });
            return;
          }
        } else {
          if (incoming === 0 || outgoing === 0) {
            console.error('Node-Fehler:', node, steps);
            setError('Jede Node (außer Start/Ende) muss mindestens einen eingehenden UND einen ausgehenden Pfad haben.');
            setSaving(false);
            toast({ title: 'Fehler', description: 'Jede Node (außer Start/Ende) muss mindestens einen eingehenden UND einen ausgehenden Pfad haben.', variant: 'destructive' });
            return;
          }
        }
      }
      // Lose Nodes prüfen (alle außer Start/End müssen verbunden sein)
      const nodeIds = new Set((steps?.nodes ?? []).map(n => n.id));
      const connected = new Set();
      (steps?.edges ?? []).forEach(e => { connected.add(e.source); connected.add(e.target); });
      const unconnected = (steps?.nodes ?? []).filter(n => n.type !== 'start' && n.type !== 'end' && !connected.has(n.id));
      if (unconnected.length > 0) {
        setError('Es gibt mindestens eine nicht verbundene Node. Bitte verbinde alle Schritte im Flow!');
        setSaving(false);
        toast({ title: 'Fehler', description: 'Es gibt mindestens eine nicht verbundene Node. Bitte verbinde alle Schritte im Flow!', variant: 'destructive' });
        return;
      }
      // Kategorie als Array aus Tags (Komma-getrennt)
      const category = tags
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      // Steps als Objekt mit nodes und edges
      const nodes = Array.isArray(steps?.nodes) ? cleanNodesForDb(steps.nodes) : [];
      const edges = Array.isArray(steps?.edges) ? cleanEdgesForDb(steps.edges) : [];
      const stepsForDb = { nodes, edges };
      const payload = {
        customer_id: customerId,
        title,
        type,
        steps: stepsForDb,
        status: 'active',
        version: initialData?.version || 1,
        category, // Tags als Array
        description, // Beschreibung
        goal, // Ziel/Ergebnis
        // notes entfernt, da nicht im Schema
        knowledge,
      };
      console.log(editMode ? 'Payload für Update:' : 'Payload für Insert:', JSON.stringify(payload, null, 2));
      let insertError;
      if (editMode && initialData?.id) {
        // Update
        const { error } = await supabase
          .from('new_use_cases')
          .update(payload)
          .eq('id', initialData.id);
        insertError = error;
      } else {
        // Insert
        const { error } = await supabase
          .from('new_use_cases')
          .insert([payload]);
        insertError = error;
      }
      if (insertError) {
        setError('Fehler beim Speichern: ' + insertError.message);
      } else {
        // Erfolgreich
        // Nach dem Speichern: Bild-Cleanup für alle Wissenseinträge
        if (Array.isArray(knowledge)) {
          for (const k of knowledge) {
            if (k?.content) {
              await cleanupUnusedImages(k.content);
            }
          }
        }
        navigate('/admin/new-use-cases');
      }
    } catch (e: any) {
      setError('Fehler beim Speichern: ' + (e.message || e.toString()));
    } finally {
      setSaving(false);
    }
  };

  // Schritt 1: Basisdaten-Formular
  const renderStep1 = () => (
    <form className="bg-white rounded-lg shadow p-6 space-y-6" onSubmit={e => { e.preventDefault(); setStep(2); }}>
      {error && <div className="text-red-600 font-medium mt-4">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">Kunde *</label>
        <select
          className="border rounded px-2 py-1 w-full"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Titel *</label>
        <input
          className="border rounded px-2 py-1 w-full"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Beschreibung</label>
        <textarea
          className="border rounded px-2 py-1 w-full min-h-[60px]"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Ziel/Ergebnis</label>
        <input
          className="border rounded px-2 py-1 w-full"
          value={goal}
          onChange={e => setGoal(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <input
          className="border rounded px-2 py-1 w-full"
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="z. B. Kündigung, Vertrag, Rechnung"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Typ</label>
        <select
          className="border rounded px-2 py-1 w-full"
          value={type}
          onChange={e => setType(e.target.value)}
          required
        >
          <option value="">Bitte wählen…</option>
          <option value="direct_use_case">Direkte Bearbeitung</option>
          <option value="forwarding_use_case">Weiterleitung</option>
          <option value="knowledge_request">Informationsanfrage</option>
        </select>
      </div>
      <button type="submit" className="bg-avanti-500 text-white px-6 py-2 rounded mt-4">Weiter</button>
    </form>
  );

  // Schritt 2: Grafischer Editor statt Platzhalter
  const renderStep2 = () => {
    console.log('steps.nodes', steps?.nodes);
    const initialNodes = addDefaultPositionsToNodes(steps?.nodes ?? []);
    console.log('initialNodes', initialNodes);
    const customerObj = customers.find(c => c.id === customerId);
    const customerName = customerObj?.name || '';
    const customerIndustry = customerObj?.industry || '';
    return (
      <div className="bg-white rounded-lg shadow p-6" style={{ display: 'flex', flexDirection: 'column', minHeight: 700 }}>
        <h2 className="text-xl font-bold mb-4">Prozess/Schritte</h2>
        {/* Kompakter Info-Block */}
        <div style={{ marginBottom: 18, marginLeft: 2, fontSize: 15, color: '#222', maxWidth: 420 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{title || 'Neuer Use Case'}</div>
          <div><b>Typ:</b> {TYPE_OPTIONS.find(opt => opt.value === type)?.label || type}</div>
          <div><b>Kunde:</b> {customerName}</div>
          {customerIndustry && <div style={{ color: '#666', fontSize: 14, marginTop: 2 }}><b>Branche:</b> {customerIndustry}</div>}
          {goal && <div><b>Ziel:</b> {goal}</div>}
          {description && <div><b>Beschreibung:</b> {description}</div>}
          {tags && <div><b>Tags:</b> {tags}</div>}
        </div>
        {/* Kompakter Node-hinzufügen-Button mit Icon, ganz links */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, marginLeft: 0 }}>
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new Event('openNodePalette'))}
            style={{ fontWeight: 500, fontSize: 15, padding: '4px 10px 4px 8px', borderRadius: 6, minWidth: 0, gap: 6, display: 'flex', alignItems: 'center' }}
          >
            <Plus size={18} style={{ marginRight: 2 }} />
            Node hinzufügen
          </Button>
        </div>
        {/* Editor in eigenem Container mit fester Höhe */}
        <div style={{ width: '100%', height: 500, background: 'transparent', marginBottom: 24 }}>
          <ReactFlowProvider>
            <ModernFlowEditor
              customerId={customerId}
              customerName={customerName}
              title={title}
              type={type}
              tags={tags}
              description={description}
              goal={goal}
              notes={notes}
              industry={customerIndustry}
              initialNodes={initialNodes}
              initialEdges={steps?.edges ?? []}
              onChangeSteps={handleFlowChange}
            />
          </ReactFlowProvider>
        </div>
        {/* Buttons in separatem Container */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outline" onClick={() => setStep(1)} disabled={saving}>Zurück</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !customerId || !title || !type || (steps?.nodes?.length ?? 0) === 0 || !hasEndNode}
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </div>
    );
  };

  // Haupt-Render-Logik:
  return (
    <div className="py-8 px-4 w-full">
      <h1 className="text-2xl font-bold mb-4">Neuen Use Case anlegen</h1>
      {step === 1 ? renderStep1() : (
        <Tabs value={step === 3 ? 'knowledge' : 'flow'} onValueChange={v => setStep(v === 'knowledge' ? 3 : 2)}>
          <TabsList>
            <TabsTrigger value="flow">Prozess</TabsTrigger>
            <TabsTrigger value="knowledge">Wissen</TabsTrigger>
          </TabsList>
          <TabsContent value="flow">
            {renderStep2()}
          </TabsContent>
          <TabsContent value="knowledge">
            <div className="space-y-6">
              <h3 className="font-semibold text-lg">Wissenseinträge</h3>
              {knowledge.map((k, idx) => (
                <KnowledgeEntry
                  key={idx}
                  value={k}
                  onChange={newVal => setKnowledge(ks => ks.map((x, i) => i === idx ? newVal : x))}
                  onDelete={() => setKnowledge(ks => ks.filter((_, i) => i !== idx))}
                />
              ))}
              <button className="bg-avanti-500 text-white px-4 py-2 rounded" onClick={() => setKnowledge(ks => ks.concat({ title: '', content: '' }))}>Neuen Wissenseintrag hinzufügen</button>
              {/* KI-Button folgt separat */}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 