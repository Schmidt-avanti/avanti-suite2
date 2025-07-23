// TEST: Diese Zeile wurde von der KI eingefügt, um die Bearbeitung zu überprüfen.
import React, { useState } from 'react';
import { ReactFlow, Background, Controls, addEdge, MiniMap, Position, Node, Edge, applyNodeChanges, applyEdgeChanges, Handle } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash, CheckCircle, HelpCircle } from 'lucide-react';

const NODE_TYPES = [
  { label: 'Anweisung', description: 'Informationen aufnehmen', nodeType: 'anweisung' },
  { label: 'Frage', description: 'Frage an den Kunden', nodeType: 'frage' },
  { label: 'Entscheidung', description: 'Entscheidung treffen', nodeType: 'entscheidung' },
  { label: 'Ende', description: 'Endpunkt', nodeType: 'ende' },
];

const initialNodes: Node[] = [
  { id: 'start', type: 'custom', data: { label: 'Start', nodeType: 'start' }, position: { x: 100, y: 100 }, sourcePosition: Position.Right },
  { id: 'step-1', type: 'custom', data: { label: 'Informationen aufnehmen', nodeType: 'anweisung' }, position: { x: 350, y: 100 }, sourcePosition: Position.Right, targetPosition: Position.Left },
  { id: 'step-2', type: 'custom', data: { label: 'Antwort geben', nodeType: 'anweisung' }, position: { x: 600, y: 100 }, sourcePosition: Position.Right, targetPosition: Position.Left },
  { id: 'end', type: 'custom', data: { label: 'Ende', nodeType: 'ende' }, position: { x: 850, y: 100 }, targetPosition: Position.Left },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'start', target: 'step-1', type: 'straight' },
  { id: 'e2', source: 'step-1', target: 'step-2', type: 'straight' },
  { id: 'e3', source: 'step-2', target: 'end', type: 'straight' },
];

const CustomNode: React.FC<{ data: any } & any> = ({ data }) => {
  let color = '#2563eb';
  let icon = <Plus size={22} />;
  if (data.nodeType === 'ende') { color = '#222'; icon = <CheckCircle size={22} />; }
  if (data.nodeType === 'entscheidung') { color = '#f59e42'; icon = <HelpCircle size={22} />; }
  if (data.nodeType === 'frage') { color = '#10b981'; icon = <HelpCircle size={22} />; }
  if (data.nodeType === 'start') { color = '#222'; icon = <CheckCircle size={22} />; }
  return (
    <div
      style={{
        background: '#f8fafc',
        border: `2px solid ${color}`,
        borderRadius: 12,
        padding: 24,
        minWidth: 220,
        minHeight: 80,
        boxShadow: '0 2px 8px #0001',
        position: 'relative',
        transition: 'box-shadow 0.2s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, width: 14, height: 14, left: -10 }} />
      <Handle type="source" position={Position.Right} style={{ background: color, width: 14, height: 14, right: -10 }} />
      <div style={{ fontWeight: 700, fontSize: 18, color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon} {data.label}
      </div>
      {data.description && <div style={{ color: '#222', fontSize: 14 }}>{data.description}</div>}
      {/* + Button */}
      {data.onAddStep && (
        <button
          style={{
            position: 'absolute',
            right: -24,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#fff',
            color,
            border: `2px solid ${color}`,
            boxShadow: '0 2px 6px #2563eb22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          title="Schritt rechts anfügen"
          onClick={e => { e.stopPropagation(); data.onAddStep && data.onAddStep(); }}
        >
          <Plus size={22} />
        </button>
      )}
      {/* Löschen-Button */}
      {data.onDelete && (
        <button
          style={{
            position: 'absolute',
            right: -24,
            bottom: -24,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            boxShadow: '0 2px 6px #ef444422',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
          title="Knoten löschen"
          onClick={e => { e.stopPropagation(); data.onDelete && data.onDelete(); }}
        >
          <Trash size={20} />
        </button>
      )}
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function FlowEditor() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [addStepParent, setAddStepParent] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<number>(0);

  const handleAddStep = (parentId: string) => {
    setAddStepParent(parentId);
    setSelectedType(0);
  };

  const handleTypeSelect = (idx: number) => setSelectedType(idx);

  const handleConfirmAddStep = () => {
    if (!addStepParent) return;
    const parent = nodes.find(n => n.id === addStepParent);
    if (!parent) return;
    const newId = `step-${Date.now()}`;
    const type = NODE_TYPES[selectedType];
    const newNode: Node = {
      id: newId,
      type: 'custom',
      data: { label: type.label, description: type.description, nodeType: type.nodeType, onAddStep: () => handleAddStep(newId), onDelete: () => handleDeleteNode(newId) },
      position: { x: parent.position.x + 180, y: parent.position.y + 100 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
    setNodes(nds => nds.concat(newNode));
    setEdges(eds => eds.concat({ id: `e-${addStepParent}-${newId}`, source: addStepParent, target: newId, type: 'straight' }));
    setAddStepParent(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  };

  const nodesWithCallbacks = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onAddStep: () => handleAddStep(n.id),
      onDelete: () => handleDeleteNode(n.id),
    },
  }));

  return (
    <div style={{ width: '100%', height: 600, position: 'relative' }}>
      <div style={{position: 'absolute', top: 10, left: 10, zIndex: 9999, background: '#fff', color: 'red', fontWeight: 700, padding: 8, borderRadius: 6, boxShadow: '0 2px 8px #0002'}}>
        TEST: Diese Zeile wurde von der KI eingefügt, um die UI zu überprüfen.
      </div>
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onNodesChange={changes => setNodes(nds => applyNodeChanges(changes, nds))}
        onEdgesChange={changes => setEdges(eds => applyEdgeChanges(changes, eds))}
        onConnect={params => setEdges(eds => addEdge({ ...params, type: 'straight' }, eds))}
      >
        <MiniMap />
        <Controls />
        <Background color="#e0e7ef" gap={18} />
      </ReactFlow>
      {addStepParent !== null && (
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 8px 32px #0002' }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Schritt-Typ wählen</div>
            {NODE_TYPES.map((t, idx) => (
              <div key={t.label} style={{
                padding: 12, marginBottom: 8, borderRadius: 8,
                background: idx === selectedType ? '#2563eb22' : '#f8fafc',
                border: idx === selectedType ? '2px solid #2563eb' : '1px solid #e0e7ef',
                cursor: 'pointer', fontWeight: 600
              }} onClick={() => handleTypeSelect(idx)}>
                {t.label} <span style={{ color: '#666', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>{t.description}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setAddStepParent(null)} style={{ marginRight: 12, padding: '8px 18px', borderRadius: 6, border: 'none', background: '#eee', fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={handleConfirmAddStep} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 