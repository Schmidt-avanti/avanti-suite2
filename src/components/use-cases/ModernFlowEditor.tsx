import React, { useState, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, applyNodeChanges, applyEdgeChanges, addEdge, Connection, Position, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '../ui/dialog';
import { CheckCircle, HelpCircle, Trash, Mail, ListChecks, PlayCircle, Sparkles } from 'lucide-react';
import CustomNode from './CustomNode';
import ELK from 'elkjs/lib/elk.bundled.js';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { mapToFlowNodes } from './flowNodeMapper';

// Node-Typen und Feldtypen
const NODE_TYPES = [
  { type: 'knowledge', label: 'Wissens-Node', description: 'Zeigt einen Wissenseintrag aus dem Use Case an.', icon: <CheckCircle size={28} color="#0ea5e9" /> },
  // Start-Node NICHT mehr auswählbar in der Palette
  // { type: 'start', label: 'Start', description: 'Einstieg in den Prozess.', icon: <PlayCircle size={28} color="#22c55e" /> },
  { type: 'info', label: 'Wissensblock', description: 'Mehrzeiliger Wissenstext für Mitarbeitende.', icon: <CheckCircle size={28} color="#0ea5e9" /> },
  { type: 'question_group', label: 'Fragenblock', description: 'Mehrere Fragen/Felder in einem Schritt.', icon: <ListChecks size={28} color="#10b981" /> },
  { type: 'decision', label: 'Entscheidung', description: 'Verzweigung im Ablauf.', icon: <HelpCircle size={28} color="#f59e42" /> },
  { type: 'action', label: 'Aktion', description: 'Systemaktion, z.B. E-Mail.', icon: <Mail size={28} color="#a21caf" /> },
  { type: 'end', label: 'Ende', description: 'Abschluss des Prozesses.', icon: <Trash size={28} color="#6b7280" /> },
];
const FIELD_TYPES = [
  { type: 'text', label: 'Textfeld' },
  { type: 'number', label: 'Zahlenfeld' },
  { type: 'date', label: 'Datum' },
  { type: 'select', label: 'Auswahl' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'textarea', label: 'Mehrzeiliger Text' },
  { type: 'email', label: 'E-Mail' },
];

const START_NODE = {
  id: 'start-node',
  type: 'custom', // <-- CustomNode verwenden
  position: { x: 200, y: 200 },
  data: {
    label: 'Start',
    type: 'start',
    description: 'Einstieg in den Prozess',
  },
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const MIN_DISTANCE = 120; // Mindestabstand zwischen Nodes
const GRID_X = 240; // Rasterbreite
const GRID_Y = 140; // Rasterhöhe

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;
const OFFSET_X = NODE_WIDTH + 40;
const OFFSET_Y = 0;

function isPositionFree(x: number, y: number, nodes: Node[]) {
  return !nodes.some(node => {
    const dx = node.position.x - x;
    const dy = node.position.y - y;
    return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE;
  });
}

function findFreePosition(centerX: number, centerY: number, nodes: Node[]) {
  if (isPositionFree(centerX, centerY, nodes)) return { x: centerX, y: centerY };
  // Spiral-/Raster-Suche um die Mitte
  const steps = [
    [MIN_DISTANCE, 0], [0, MIN_DISTANCE], [-MIN_DISTANCE, 0], [0, -MIN_DISTANCE],
    [MIN_DISTANCE, MIN_DISTANCE], [-MIN_DISTANCE, MIN_DISTANCE], [MIN_DISTANCE, -MIN_DISTANCE], [-MIN_DISTANCE, -MIN_DISTANCE],
    [2*MIN_DISTANCE, 0], [0, 2*MIN_DISTANCE], [-2*MIN_DISTANCE, 0], [0, -2*MIN_DISTANCE],
    [2*MIN_DISTANCE, MIN_DISTANCE], [MIN_DISTANCE, 2*MIN_DISTANCE], [-2*MIN_DISTANCE, MIN_DISTANCE], [MIN_DISTANCE, -2*MIN_DISTANCE],
    [-MIN_DISTANCE, 2*MIN_DISTANCE], [2*MIN_DISTANCE, -MIN_DISTANCE], [-2*MIN_DISTANCE, -MIN_DISTANCE], [-MIN_DISTANCE, -2*MIN_DISTANCE],
  ];
  for (const [dx, dy] of steps) {
    const x = centerX + dx, y = centerY + dy;
    if (isPositionFree(x, y, nodes)) return { x, y };
  }
  // Fallback: einfach rechts unten
  return { x: centerX + 200, y: centerY + 200 };
}

function isGridFree(x: number, y: number, nodes: Node[]) {
  return !nodes.some(node => {
    return (
      Math.abs(node.position.x - x) < GRID_X / 2 &&
      Math.abs(node.position.y - y) < GRID_Y / 2
    );
  });
}

function findNextGridPosition(centerX: number, centerY: number, nodes: Node[]) {
  // Spiral um die Mitte: (0,0), (1,0), (0,1), (-1,0), (0,-1), (1,1), (-1,1), (1,-1), (-1,-1), ...
  const directions = [
    [0, 0], [1, 0], [0, 1], [-1, 0], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [2, 0], [0, 2], [-2, 0], [0, -2],
    [2, 1], [1, 2], [-2, 1], [1, -2],
    [-1, 2], [2, -1], [-2, -1], [-1, -2],
    // ... ggf. erweitern
  ];
  for (const [dx, dy] of directions) {
    const x = centerX + dx * GRID_X;
    const y = centerY + dy * GRID_Y;
    if (isGridFree(x, y, nodes)) return { x, y };
  }
  // Fallback: noch weiter rechts unten
  return { x: centerX + 3 * GRID_X, y: centerY + 3 * GRID_Y };
}

function findNextGridSlot(centerX: number, centerY: number, nodes: Node[]) {
  const GRID_X = 240;
  const GRID_Y = 140;
  const GRID_SIZE = 5; // 5x5 Grid
  const half = Math.floor(GRID_SIZE / 2);
  // Wir gehen Zeile für Zeile, von oben links nach unten rechts
  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      const x = centerX + col * GRID_X;
      const y = centerY + row * GRID_Y;
      const isFree = !nodes.some(node =>
        Math.abs(node.position.x - x) < GRID_X / 2 &&
        Math.abs(node.position.y - y) < GRID_Y / 2
      );
      if (isFree) return { x, y };
    }
  }
  // Fallback: noch weiter rechts unten
  return { x: centerX + 3 * GRID_X, y: centerY + 3 * GRID_Y };
}

function getNextNodePosition(nodes: Node[], centerX: number, centerY: number) {
  if (nodes.length === 0) return { x: centerX, y: centerY };
  const last = nodes[nodes.length - 1];
  return { x: last.position.x + OFFSET_X, y: last.position.y + OFFSET_Y };
}

// Hilfsfunktion für Namensgenerierung
function generateFieldName(label: string) {
  return label
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

const ACTION_TYPES = [
  { value: 'wiedervorlage', label: 'Wiedervorlage' },
  { value: 'email_kunde', label: 'E-Mail an Kunden' },
  { value: 'email_endkunde', label: 'E-Mail an Endkunden' },
  { value: 'anderes', label: 'Anderes' },
];

// Hilfsfunktion: Nodes mit Position versehen
function assignDefaultPositions(nodes: any[]): any[] {
  const spacingX = 220;
  const spacingY = 120;
  return nodes.map((node, i) => ({
    ...node,
    position: node.position || { x: spacingX * (i % 4), y: spacingY * Math.floor(i / 4) },
  }));
}

// Hilfsfunktion: KI-Nodes auf 'custom' mappen (ersetzt durch zentrale Mapping-Funktion)
// function mapImportedNodes(nodesFromAI: any[]): Node[] { ... }

// nodeTypes stabil außerhalb der Komponente definieren
const nodeTypes = { custom: CustomNode };

interface ModernFlowEditorProps {
  customerId: string;
  customerName: string;
  title: string;
  type: string;
  tags: string;
  description: string;
  goal?: string;
  notes: string;
  industry?: string; // <-- Ergänzt für KI-Flow
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onChangeSteps?: (data: { nodes: Node[]; edges: Edge[] }) => void; // Typ angepasst
}

const ModernFlowEditor: React.FC<ModernFlowEditorProps> = ({
  customerId,
  customerName,
  title,
  type,
  tags,
  description,
  goal,
  notes,
  industry = '',
  initialNodes,
  initialEdges,
  onChangeSteps,
}) => {
  const [nodes, setNodes] = useState<Node[]>(() =>
    Array.isArray(initialNodes) && initialNodes.length > 0 ? initialNodes : [START_NODE]
  );
  const [edges, setEdges] = useState<Edge[]>(() => Array.isArray(initialEdges) ? initialEdges : initialEdges === undefined ? initialEdges : []);
  // Debug-Log für nodes-State
  console.log('ModernFlowEditor nodes', nodes);
  // Callback an Parent immer nach Änderung
  useEffect(() => {
    if (typeof onChangeSteps === 'function') {
      onChangeSteps({ nodes, edges });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);
  const [showPalette, setShowPalette] = useState(false);
  const [selectedType, setSelectedType] = useState(NODE_TYPES[0].type);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeDescription, setNewNodeDescription] = useState('');
  const [fields, setFields] = useState<any[]>([]);
  const [fieldDraft, setFieldDraft] = useState({ type: 'text', label: '' });
  const [hintText, setHintText] = useState('');
  const [decisionOptions, setDecisionOptions] = useState<string[]>(['Ja', 'Nein']);
  const [optionDraft, setOptionDraft] = useState('');
  const { screenToFlowPosition } = useReactFlow();

  const [actionType, setActionType] = useState(ACTION_TYPES[0].value);
  const [actionCustom, setActionCustom] = useState('');

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFields, setEditFields] = useState<any[]>([]);
  const [editHint, setEditHint] = useState('');
  const [editDecisionOptions, setEditDecisionOptions] = useState<string[]>([]);
  const [editOptionDraft, setEditOptionDraft] = useState('');
  const [editActionType, setEditActionType] = useState(ACTION_TYPES[0].value);
  const [editActionCustom, setEditActionCustom] = useState('');

  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);

  // Felder beim Öffnen des Dialogs immer zurücksetzen
  const openNodePalette = () => {
    setSelectedType(NODE_TYPES[0].type);
    setNewNodeLabel('');
    setNewNodeDescription('');
    setFields([]);
    setShowPalette(true);
  };

  // Palette-Öffnung über globales Event
  useEffect(() => {
    const handler = () => openNodePalette();
    window.addEventListener('openNodePalette', handler);
    return () => window.removeEventListener('openNodePalette', handler);
  }, []);

  // Feld hinzufügen (nur für question_group)
  const addField = () => {
    if (!fieldDraft.label) return;
    const name = generateFieldName(fieldDraft.label);
    setFields(f => [...f, { ...fieldDraft, name }]);
    setFieldDraft({ type: 'text', label: '' });
  };
  const removeField = (idx: number) => setFields(f => f.filter((_, i) => i !== idx));

  // Entscheidungsoption hinzufügen
  const addDecisionOption = () => {
    const val = optionDraft.trim();
    if (!val || decisionOptions.includes(val)) return;
    setDecisionOptions(opts => [...opts, val]);
    setOptionDraft('');
  };
  const removeDecisionOption = (idx: number) => setDecisionOptions(opts => opts.filter((_, i) => i !== idx));

  // Node anlegen (manuell)
  const handleAddNode = () => {
    let centerX = 200, centerY = 200;
    if (screenToFlowPosition) {
      const projected = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      centerX = projected.x;
      centerY = projected.y;
    }
    const { x, y } = getNextNodePosition(nodes, centerX, centerY);
    const id = `node-${Date.now()}`;
    const nodeData: any = {
      label: newNodeLabel || NODE_TYPES.find(t => t.type === selectedType)?.label || 'Node',
      type: selectedType,
      description: newNodeDescription,
    };
    if (selectedType === 'info') {
      nodeData.description = newNodeDescription; // Mehrzeiliger Wissenstext
    }
    if (selectedType === 'question_group') {
      nodeData.fields = fields;
    }
    if (selectedType === 'decision') {
      nodeData.options = decisionOptions.filter(opt => !!opt.trim());
    }
    if (selectedType === 'action') {
      nodeData.actionType = actionType;
      if (actionType === 'anderes' && actionCustom.trim()) {
        nodeData.actionCustom = actionCustom.trim();
      }
    }
    if (selectedType !== 'start' && selectedType !== 'end' && hintText.trim()) {
      nodeData.hint = hintText.trim();
    }
    // Zentrale Mapping-Funktion nutzen
    let mappedNode = mapToFlowNodes([{ ...nodeData, id, position: { x, y } }])[0];
    mappedNode.data = {
      ...mappedNode.data,
      onEdit: () => onNodeClick(null, mappedNode)
    };
    setNodes(nds => [
      ...nds.map(n => ({ ...n, data: { ...n.data, onEdit: () => onNodeClick(null, n) } })),
      mappedNode
    ]);
    // Automatisch verbinden, wenn bisher nur der Start-Node existiert
    if (nodes.length === 1 && nodes[0].id === 'start-node') {
      setEdges(eds => eds.concat({
        id: `e-start-${id}`,
        source: 'start-node',
        target: id,
        // ggf. weitere Edge-Props
      }));
    }
    setShowPalette(false);
    setHintText('');
    setDecisionOptions(['Ja', 'Nein']);
    setActionType(ACTION_TYPES[0].value);
    setActionCustom('');
  };

  // Node-Klick-Handler
  const onNodeClick = (_: any, node: Node) => {
    console.log('Node wurde geklickt:', node);
    setShowPalette(false); // Palette schließen, falls offen
    setSelectedNode(node);
    setEditLabel(String(node.data.label || ''));
    setEditDescription(String(node.data.description || ''));
    setEditFields(Array.isArray(node.data.fields) ? node.data.fields : []);
    setEditHint(String(node.data.hint || ''));
    setEditDecisionOptions(Array.isArray(node.data.options) ? node.data.options : ['Ja', 'Nein']);
    setEditActionType(String(node.data.actionType || ACTION_TYPES[0].value));
    setEditActionCustom(String(node.data.actionCustom || ''));
  };

  // Node speichern
  const handleSaveNode = () => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? {
      ...n,
      data: {
        ...n.data,
        label: editLabel,
        description: editDescription,
        fields: selectedNode.data.type === 'question_group' ? editFields : undefined,
        options: selectedNode.data.type === 'decision' ? editDecisionOptions : undefined,
        hint: (selectedNode.data.type !== 'start' && selectedNode.data.type !== 'end') ? editHint : undefined,
        actionType: selectedNode.data.type === 'action' ? editActionType : undefined,
        actionCustom: (selectedNode.data.type === 'action' && editActionType === 'anderes') ? editActionCustom : undefined,
      }
    } : n));
    setSelectedNode(null);
  };
  const handleCancelEdit = () => setSelectedNode(null);

  const handleNodesChange = (changes: any) => {
    // Keine Änderung, die den Start-Node entfernt
    const filtered = changes.filter((c: any) => !(c.type === 'remove' && c.id === 'start-node'));
    setNodes(nds => applyNodeChanges(filtered, nds));
  };
  const handleEdgesChange = (changes: any) => setEdges(eds => applyEdgeChanges(changes, eds));
  const handleConnect = (connection: Connection) => setEdges(eds => addEdge(connection, eds));
  const handleEdgeClick = (_: any, edge: Edge) => setEdges(eds => eds.filter(e => e.id !== edge.id));

  const handleDeleteNode = (id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
  };

  // Nodes mit onEdit- und onDelete-Callback anreichern (immer aktuell)
  const nodesWithEdit = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onEdit: () => onNodeClick(null, n),
      onDelete: () => handleDeleteNode(n.id),
    },
  }));

  // Button für Auto-Layout
  const handleAutoLayout = async () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getElkLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  };

  // KI-Flow generieren
  const handleGenerateAIFlow = async () => {
    setLoadingAI(true);
    setAIError(null);
    // Logging der Request-Daten
    console.log('KI-Flow-Request (an Edge Function):', {
      title,
      description,
      industry,
      type,
      goal
    });
    try {
      const { data, error } = await supabase.functions.invoke('generate-guided-dialog-flow', {
        body: {
          title: title || '',
          description: description || '',
          industry: industry || '',
          type: type || '',
          expected_result: goal || '',
        },
      });
      if (error) {
        setAIError('Fehler beim Aufruf der KI-Funktion: ' + (error.message || error.toString()));
      } else if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
        console.log('KI-Flow-RAW:', data);
        // Zentrale Mapping-Funktion nutzen
        const mappedNodes = mapToFlowNodes(data.nodes);
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getElkLayoutedElements(mappedNodes, data.edges);
        const completedEdges = ensureSequentialEdges(layoutedNodes, layoutedEdges);
        console.log('KI-Flow-Nodes nach Layout:', layoutedNodes);
        console.log('KI-Flow-Edges nach Layout:', completedEdges);
        setNodes(layoutedNodes); // <-- Nur KI-Nodes übernehmen!
        setEdges(completedEdges);
        if (typeof onChangeSteps === 'function') {
          onChangeSteps({ nodes: layoutedNodes, edges: completedEdges });
        }
      } else {
        setAIError('Die KI-Antwort war unvollständig oder fehlerhaft.');
      }
    } catch (err) {
      setAIError('Fehler beim Parsen der KI-Antwort: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingAI(false);
    }
  };

  // Debug-Log direkt vor dem Rendern
  console.log('RENDER: nodes an ReactFlow:', nodes.map(n => ({id: n.id, type: n.type, dataType: n.data?.type})));

  return (
    <div style={{ width: '100%', height: 450, background: '#f8fafc', borderRadius: 12, position: 'relative', paddingTop: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '12px 18px 0 18px', alignItems: 'center' }}>
        <button onClick={openNodePalette} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px #2563eb33' }}>+ Node hinzufügen</button>
        <button
          onClick={handleGenerateAIFlow}
          disabled={loadingAI}
          style={{
            background: 'linear-gradient(90deg, #fbbf24 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 22px',
            fontWeight: 700,
            fontSize: 16,
            cursor: loadingAI ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px #2563eb33',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginLeft: 8,
            opacity: loadingAI ? 0.7 : 1,
          }}
        >
          <Sparkles size={22} style={{ marginRight: 2 }} />
          {loadingAI ? 'KI generiert Flow...' : 'KI-Flow generieren'}
        </button>
        <button onClick={handleAutoLayout} style={{ background: '#e5e7eb', borderRadius: 6, padding: '6px 14px', fontWeight: 500, border: 'none', cursor: 'pointer', marginLeft: 8 }}>
          🧩 Auto-Layout
        </button>
        {aiError && <span style={{ color: '#ef4444', marginLeft: 18, fontWeight: 500 }}>{aiError}</span>}
      </div>
      {/* Editor-Canvas ohne Info-Panel und ohne Button */}
      {/* Bearbeitungs-Modal, Palette usw. bleiben erhalten */}
      <Dialog open={!!selectedNode} onOpenChange={v => !v && setSelectedNode(null)}>
        <DialogContent style={{ maxWidth: 700, width: '100%', minWidth: 340, boxSizing: 'border-box', padding: 0 }}>
          <div style={{ padding: 36, paddingBottom: 24 }}>
            <DialogHeader>
              <DialogTitle>Node bearbeiten</DialogTitle>
              <DialogDescription>Bearbeite die Eigenschaften dieses Schritts</DialogDescription>
            </DialogHeader>
            {selectedNode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 15 }}>Titel:</label>
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Titel des Schritts" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 15 }} />
                <label style={{ fontWeight: 600, fontSize: 15 }}>Beschreibung:</label>
                <input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="(optional)" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 15 }} />
                {/* Felder für Fragenblock */}
                {selectedNode.data.type === 'question_group' && (
                  <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16, marginTop: 8, background: '#f8fafc' }}>
                    <b style={{ fontSize: 15 }}>Felder:</b>
                    {editFields.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, marginTop: 6 }}>
                        <span style={{ fontWeight: 500 }}>{FIELD_TYPES.find(ft => ft.type === f.type)?.label || f.type}</span>
                        <span>{f.label}</span>
                        <span style={{ color: '#bbb', fontSize: 12 }}>{f.name}</span>
                        <button onClick={() => setEditFields(ef => ef.filter((_: any, idx: number) => idx !== i))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, marginLeft: 4 }}>✕</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                      <select value={fieldDraft.type} onChange={e => setFieldDraft(fd => ({ ...fd, type: e.target.value }))} style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15 }}>
                        {FIELD_TYPES.map(ft => <option key={ft.type} value={ft.type}>{ft.label}</option>)}
                      </select>
                      <input value={fieldDraft.label} onChange={e => setFieldDraft(fd => ({ ...fd, label: e.target.value }))} placeholder="Frage / Feldtext" style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15, flex: 1 }} />
                      {fieldDraft.label && (
                        <span style={{ color: '#bbb', fontSize: 12, minWidth: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Interner Name (wird automatisch vergeben)">{generateFieldName(fieldDraft.label)}</span>
                      )}
                      <button onClick={() => {
                        if (!fieldDraft.label) return;
                        const name = generateFieldName(fieldDraft.label);
                        setEditFields(f => [...f, { ...fieldDraft, name }]);
                        setFieldDraft({ type: 'text', label: '' });
                      }} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 7, padding: '0 16px', fontWeight: 700, fontSize: 22, cursor: 'pointer', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>
                )}
                {/* Optionen für Entscheidung */}
                {selectedNode.data.type === 'decision' && (
                  <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16, marginTop: 8, background: '#f8fafc' }}>
                    <b style={{ fontSize: 15 }}>Optionen:</b>
                    {editDecisionOptions.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, marginTop: 6 }}>
                        <span style={{ fontWeight: 500 }}>{opt}</span>
                        <button onClick={() => setEditDecisionOptions(opts => opts.filter((_: any, idx: number) => idx !== i))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, marginLeft: 4 }}>✕</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                      <input value={editOptionDraft} onChange={e => setEditOptionDraft(e.target.value)} placeholder="Neue Option" style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15, flex: 1 }} />
                      <button onClick={() => {
                        const val = editOptionDraft.trim();
                        if (!val || editDecisionOptions.includes(val)) return;
                        setEditDecisionOptions(opts => [...opts, val]);
                        setEditOptionDraft('');
                      }} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 7, padding: '0 16px', fontWeight: 700, fontSize: 22, cursor: 'pointer', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>
                )}
                {/* Aktionsart */}
                {selectedNode.data.type === 'action' && (
                  <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16, marginTop: 8, background: '#f8fafc' }}>
                    <b style={{ fontSize: 15 }}>Aktion auswählen:</b>
                    <select value={editActionType} onChange={e => setEditActionType(e.target.value)} style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15, marginTop: 8, marginBottom: 8 }}>
                      {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                    {editActionType === 'anderes' && (
                      <input value={editActionCustom} onChange={e => setEditActionCustom(e.target.value)} placeholder="Beschreibe die Aktion" style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15, marginTop: 8 }} />
                    )}
                  </div>
                )}
                {/* Hinweistext */}
                {selectedNode.data.type !== 'start' && selectedNode.data.type !== 'end' && (
                  <>
                    <label style={{ fontWeight: 600, fontSize: 15, marginTop: 6 }}>Hinweistext (optional):</label>
                    <textarea
                      value={editHint}
                      onChange={e => setEditHint(e.target.value)}
                      placeholder="Dieser Hinweis wird dir an dieser Stelle angezeigt (z. B. 'Bitte prüfe die Angaben sorgfältig.')"
                      style={{ padding: 10, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 15, minHeight: 48, resize: 'vertical' }}
                    />
                  </>
                )}
                {selectedNode && selectedNode.data.type === 'info' && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontWeight: 600, fontSize: 15 }}>Wissenstext (mehrzeilig):</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder="Hier kannst du Wissen, Hinweise oder Standardantworten für diesen Schritt eintragen."
                      style={{ padding: 10, borderRadius: 8, border: '1.5px solid #0ea5e9', fontSize: 15, minHeight: 80, resize: 'vertical', background: '#f0f9ff', color: '#0369a1', marginTop: 4 }}
                    />
                  </div>
                )}
                {/* Entferne die gesamte Knowledge-Node-Vorschau */}
                {/* TODO: Vorschau für Wissens-Node einbauen, sobald Wissensdaten als Prop/Context verfügbar sind */}
              </div>
            )}
            <DialogFooter>
              <button onClick={handleSaveNode} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, marginTop: 18, fontSize: 17, cursor: 'pointer', boxShadow: '0 2px 8px #2563eb33' }}>Speichern</button>
              <DialogClose asChild>
                <button onClick={handleCancelEdit} style={{ background: '#e5e7eb', color: '#222', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, marginTop: 18, fontSize: 17, cursor: 'pointer' }}>Abbrechen</button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* Palette (Dialog) */}
      <Dialog open={showPalette} onOpenChange={setShowPalette}>
        <DialogContent
          style={{ maxWidth: 700, width: '100%', minWidth: 340, boxSizing: 'border-box', padding: 0 }}
        >
          <div style={{ padding: 36, paddingBottom: 24 }}>
            <DialogHeader>
              <DialogTitle>Neuen Node anlegen</DialogTitle>
              <DialogDescription>Wähle Typ, Titel und ggf. Felder</DialogDescription>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 15 }}>Typ:</label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 8,
                justifyContent: 'flex-start',
                alignItems: 'stretch',
                width: '100%',
              }}>
                {NODE_TYPES.map(t => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setSelectedType(t.type)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: selectedType === t.type ? '2.5px solid #2563eb' : '1.5px solid #e5e7eb',
                      background: selectedType === t.type ? '#f1f5ff' : '#fff',
                      borderRadius: 14,
                      padding: 12,
                      minWidth: 110,
                      maxWidth: 140,
                      minHeight: 100,
                      boxShadow: selectedType === t.type ? '0 2px 12px #2563eb22' : '0 1px 4px #0001',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      outline: 'none',
                      gap: 7,
                      flex: '1 1 120px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {t.icon}
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</span>
                    <span style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 2 }}>{t.description}</span>
                  </button>
                ))}
              </div>
              <label style={{ fontWeight: 600, fontSize: 15 }}>Label:</label>
              <input value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)} placeholder="Titel des Schritts" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 15 }} />
              <label style={{ fontWeight: 600, fontSize: 15 }}>Beschreibung:</label>
              <input value={newNodeDescription} onChange={e => setNewNodeDescription(e.target.value)} placeholder="(optional)" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 15 }} />
              {selectedType === 'question_group' && (
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16, marginTop: 8, background: '#f8fafc' }}>
                  <b style={{ fontSize: 15 }}>Felder:</b>
                  {fields.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, marginTop: 6 }}>
                      <span style={{ fontWeight: 500 }}>{FIELD_TYPES.find(ft => ft.type === f.type)?.label || f.type}</span>
                      <span>{f.label}</span>
                      <span style={{ color: '#bbb', fontSize: 12 }}>{f.name}</span>
                      <button onClick={() => removeField(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, marginLeft: 4 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <select value={fieldDraft.type} onChange={e => setFieldDraft(fd => ({ ...fd, type: e.target.value }))} style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15 }}>
                      {FIELD_TYPES.map(ft => <option key={ft.type} value={ft.type}>{ft.label}</option>)}
                    </select>
                    <input value={fieldDraft.label} onChange={e => setFieldDraft(fd => ({ ...fd, label: e.target.value }))} placeholder="Frage / Feldtext" style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15, flex: 1 }} />
                    {fieldDraft.label && (
                      <span style={{ color: '#bbb', fontSize: 12, minWidth: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Interner Name (wird automatisch vergeben)">{generateFieldName(fieldDraft.label)}</span>
                    )}
                    <button onClick={addField} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 7, padding: '0 16px', fontWeight: 700, fontSize: 22, cursor: 'pointer', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {selectedType === 'decision' && (
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16, marginTop: 8, background: '#f8fafc' }}>
                  <b style={{ fontSize: 15 }}>Optionen:</b>
                  {decisionOptions.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, marginTop: 6 }}>
                      <span style={{ fontWeight: 500 }}>{opt}</span>
                      <button onClick={() => removeDecisionOption(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, marginLeft: 4 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <input value={optionDraft} onChange={e => setOptionDraft(e.target.value)} placeholder="Neue Option" style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15, flex: 1 }} />
                    <button onClick={addDecisionOption} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 7, padding: '0 16px', fontWeight: 700, fontSize: 22, cursor: 'pointer', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )}
              {selectedType === 'action' && (
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16, marginTop: 8, background: '#f8fafc' }}>
                  <b style={{ fontSize: 15 }}>Aktion auswählen:</b>
                  <select value={actionType} onChange={e => setActionType(e.target.value)} style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15, marginTop: 8, marginBottom: 8 }}>
                    {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  {actionType === 'anderes' && (
                    <input value={actionCustom} onChange={e => setActionCustom(e.target.value)} placeholder="Beschreibe die Aktion" style={{ padding: 8, borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: 15, marginTop: 8 }} />
                  )}
                </div>
              )}
              {selectedType !== 'start' && selectedType !== 'end' && (
                <>
                  <label style={{ fontWeight: 600, fontSize: 15, marginTop: 6 }}>Hinweistext (optional):</label>
                  <textarea
                    value={hintText}
                    onChange={e => setHintText(e.target.value)}
                    placeholder="Dieser Hinweis wird dir an dieser Stelle angezeigt (z. B. 'Bitte prüfe die Angaben sorgfältig.')"
                    style={{ padding: 10, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 15, minHeight: 48, resize: 'vertical' }}
                  />
                </>
              )}
            </div>
            <DialogFooter>
              <button onClick={handleAddNode} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, marginTop: 18, fontSize: 17, cursor: 'pointer', boxShadow: '0 2px 8px #2563eb33' }}>Node anlegen</button>
              <DialogClose asChild>
                <button style={{ background: '#e5e7eb', color: '#222', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, marginTop: 18, fontSize: 17, cursor: 'pointer' }}>Abbrechen</button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* React Flow */}
      <ReactFlow
        nodes={nodesWithEdit}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        onNodeClick={onNodeClick}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        nodesDraggable={true}
        elementsSelectable={true}
        nodesConnectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        style={{ width: '100%', height: '100%' }}
        nodeTypes={nodeTypes}
      >
        <MiniMap />
        <Controls />
        <Background color="#e0e7ef" gap={18} />
      </ReactFlow>
    </div>
  );
};

// --- ELK Layout Utility ---
type ElkLayoutResult = { nodes: Node[]; edges: Edge[]; elkError: boolean };
const elkLayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '60',
  'elk.spacing.nodeNode': '40',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};
const elk = new ELK();
async function getElkLayoutedElements(nodes: Node[], edges: Edge[]): Promise<ElkLayoutResult> {
  if (!nodes || nodes.length === 0) {
    return { nodes: [], edges: [], elkError: false };
  }
  const nodesStr = nodes.map(n => ({ ...n, id: String(n.id) }));
  const edgesStr = edges.map(e => ({ ...e, source: String(e.source), target: String(e.target) }));
  const elkGraph = {
    id: "root",
    layoutOptions: elkLayoutOptions,
    children: nodesStr.map((node) => ({
      id: node.id,
      width: 240,
      height: 120,
    })),
    edges: edgesStr.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
  try {
    const layout = await elk.layout(elkGraph);
    const nodePositions: Record<string, { x: number; y: number }> = {};
    layout.children.forEach((n: any) => {
      nodePositions[n.id] = { x: n.x, y: n.y };
    });
    const layoutedNodes = nodesStr.map((node) => ({
      ...node,
      position: nodePositions[node.id] || { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
    return { nodes: layoutedNodes, edges: edgesStr, elkError: false };
  } catch (err) {
    console.error("ELK-Layout-Fehler:", err);
    return {
      nodes: nodesStr.map((node, i) => ({
        ...node,
        position: { x: 100, y: 100 + i * 150 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })),
      edges: edgesStr,
      elkError: true,
    };
  }
}

// Ergänze fehlende Kanten zwischen aufeinanderfolgenden Nodes
function ensureSequentialEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const edgeSet = new Set(edges.map(e => `${e.source}->${e.target}`));
  const newEdges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i].id;
    const to = nodes[i + 1].id;
    const hasOutgoing = edges.some(e => e.source === from);
    const hasIncoming = edges.some(e => e.target === to);
    if (!hasOutgoing && !hasIncoming && !edgeSet.has(`${from}->${to}`)) {
      newEdges.push({
        id: `auto-${from}-${to}`,
        source: from,
        target: to,
      });
    }
  }
  return [...edges, ...newEdges];
}

export default ModernFlowEditor; 