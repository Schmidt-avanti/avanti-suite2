import React, { useCallback, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, addEdge, applyNodeChanges, applyEdgeChanges, Node, Edge, Connection, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sparkles, HelpCircle, CheckCircle, Mail, Trash, ListChecks, PlayCircle } from 'lucide-react';

const nodeTypes = {
  custom: CustomNode
};

function CustomNode({ data }: any) {
  let color = '#2563eb';
  let icon = <CheckCircle size={22} />;
  if (data.type === 'end') { color = '#6b7280'; icon = <Trash size={22} />; }
  if (data.type === 'decision') { color = '#f59e42'; icon = <HelpCircle size={22} />; }
  if (data.type === 'question') { color = '#10b981'; icon = <ListChecks size={22} />; }
  if (data.type === 'start') { color = '#22c55e'; icon = <PlayCircle size={22} />; }
  if (data.type === 'action') { color = '#a21caf'; icon = <Mail size={22} />; }
  if (data.type === 'info') { color = '#0ea5e9'; icon = <CheckCircle size={22} />; }
  return (
    <div style={{
      background: '#fff',
      border: `2.5px solid ${color}`,
      borderRadius: 16,
      padding: 18,
      minWidth: 200,
      minHeight: 80,
      boxShadow: '0 2px 8px #0001',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 6
    }}>
      <div style={{ fontWeight: 700, fontSize: 18, color, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon} {data.label}
      </div>
      {data.type === 'decision' && data.options && (
        <div style={{ marginTop: 8 }}>
          <b>Optionen:</b>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.options.map((opt: string, i: number) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: '#fff7ed', color: '#f59e42', borderRadius: 5, padding: '2px 10px', fontSize: 14, border: '1px solid #f59e42', fontWeight: 600 }}>{opt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const initialNodes: Node[] = [
  { id: 'start', type: 'custom', data: { label: 'Start', type: 'start' }, position: { x: 100, y: 200 }, sourcePosition: Position.Right },
  { id: 'q1', type: 'custom', data: { label: 'Was ist das Anliegen?', type: 'question' }, position: { x: 350, y: 200 }, sourcePosition: Position.Right, targetPosition: Position.Left },
  { id: 'd1', type: 'custom', data: { label: 'Kündigung erhalten?', type: 'decision', options: ['Ja', 'Nein'] }, position: { x: 650, y: 200 }, sourcePosition: Position.Right, targetPosition: Position.Left },
  { id: 'end', type: 'custom', data: { label: 'Ende', type: 'end' }, position: { x: 950, y: 200 }, targetPosition: Position.Left },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'start', target: 'q1', type: 'smoothstep' },
  { id: 'e2', source: 'q1', target: 'd1', type: 'smoothstep' },
  { id: 'e3', source: 'd1', target: 'end', type: 'smoothstep' },
];

const ModernGuidedDialogEditor: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)), []);

  return (
    <div style={{ width: '100%', height: 600, background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 700, fontSize: 16 }}>+ Schritt</button>
        <button style={{ background: '#fbbf24', color: '#222', fontWeight: 700, borderRadius: 8, padding: '8px 22px', fontSize: 16, marginLeft: 16 }}><Sparkles size={20} style={{ marginRight: 6, marginBottom: -3 }} />KI-Vorschlag</button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        style={{ width: '100%', height: 520 }}
      >
        <MiniMap />
        <Controls />
        <Background color="#e0e7ef" gap={18} />
      </ReactFlow>
    </div>
  );
};

export default ModernGuidedDialogEditor; 