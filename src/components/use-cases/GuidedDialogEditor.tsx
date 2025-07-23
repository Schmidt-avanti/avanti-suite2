import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Typen für Dialogschritte und Optionen
export type DialogNodeType = 'start' | 'info' | 'question' | 'decision' | 'action' | 'end';

export interface DialogOption {
  id: string;
  label: string;
  targetNodeId?: string;
}

export interface DialogNode {
  id: string;
  type: DialogNodeType;
  label: string;
  description?: string;
  options?: DialogOption[];
  x: number;
  y: number;
}

interface GuidedDialogEditorProps {
  initialNodes?: DialogNode[];
}

const NODE_WIDTH = 240;
const NODE_HEIGHT = 100;

const defaultNodes: DialogNode[] = [
  { id: 'start', type: 'start', label: 'Start', x: 100, y: 200 },
  { id: 'n1', type: 'question', label: 'Was ist das Anliegen?', x: 400, y: 200 },
  { id: 'n2', type: 'decision', label: 'Kündigung erhalten?', x: 700, y: 200, options: [
    { id: 'opt1', label: 'Ja' },
    { id: 'opt2', label: 'Nein' },
  ] },
  { id: 'n3', type: 'end', label: 'Ende', x: 1000, y: 200 },
];

export const GuidedDialogEditor: React.FC<GuidedDialogEditorProps> = ({ initialNodes }) => {
  const [nodes, setNodes] = useState<DialogNode[]>(initialNodes || defaultNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  // Dummy-KI-Vorschlag
  const handleAIClick = () => {
    alert('Hier könnte ein KI-Vorschlag erscheinen!');
  };

  // Drag & Drop
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    setDraggedNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId && dragOffset) {
      setNodes(nodes => nodes.map(n => n.id === draggedNodeId ? { ...n, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } : n));
    }
  };
  const handleMouseUp = () => {
    setDraggedNodeId(null);
    setDragOffset(null);
  };

  // Node hinzufügen
  const handleAddNode = (type: DialogNodeType) => {
    const newId = uuidv4();
    setNodes(nodes => [...nodes, {
      id: newId,
      type,
      label: type === 'decision' ? 'Neue Entscheidung' : 'Neuer Schritt',
      x: 200 + nodes.length * 80,
      y: 300,
      options: type === 'decision' ? [
        { id: uuidv4(), label: 'Option 1' },
        { id: uuidv4(), label: 'Option 2' },
      ] : undefined,
    }]);
  };

  // Inline-Bearbeitung
  const handleLabelChange = (id: string, label: string) => {
    setNodes(nodes => nodes.map(n => n.id === id ? { ...n, label } : n));
  };
  const handleOptionLabelChange = (nodeId: string, optId: string, label: string) => {
    setNodes(nodes => nodes.map(n => n.id === nodeId ? {
      ...n,
      options: n.options?.map(o => o.id === optId ? { ...o, label } : o)
    } : n));
  };

  // Render
  return (
    <div style={{ width: '100%', height: 600, position: 'relative', background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e5e7eb', overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{ padding: 16, display: 'flex', gap: 12 }}>
        <button onClick={() => handleAddNode('question')}>+ Frage</button>
        <button onClick={() => handleAddNode('decision')}>+ Entscheidung</button>
        <button onClick={() => handleAddNode('info')}>+ Info</button>
        <button onClick={() => handleAddNode('action')}>+ Aktion</button>
        <button onClick={() => handleAddNode('end')}>+ Ende</button>
        <button style={{ marginLeft: 32, background: '#fbbf24', color: '#222', fontWeight: 700, borderRadius: 6, padding: '6px 18px' }} onClick={handleAIClick}>KI-Vorschlag</button>
      </div>
      {/* Nodes */}
      {nodes.map(node => (
        <div
          key={node.id}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: NODE_WIDTH,
            minHeight: NODE_HEIGHT,
            background: selectedNodeId === node.id ? '#e0e7ef' : '#fff',
            border: '2px solid #2563eb',
            borderRadius: 12,
            boxShadow: '0 2px 8px #0001',
            padding: 18,
            cursor: 'move',
            zIndex: draggedNodeId === node.id ? 10 : 1,
            userSelect: 'none',
          }}
          onMouseDown={e => handleMouseDown(e, node.id)}
          onClick={() => setSelectedNodeId(node.id)}
        >
          <input
            style={{ fontWeight: 700, fontSize: 18, border: 'none', background: 'transparent', width: '90%' }}
            value={node.label}
            onChange={e => handleLabelChange(node.id, e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          {node.type === 'decision' && node.options && (
            <div style={{ marginTop: 10 }}>
              <b>Optionen:</b>
              {node.options.map(opt => (
                <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    style={{ fontSize: 15, border: '1px solid #ddd', borderRadius: 4, padding: '2px 6px' }}
                    value={opt.label}
                    onChange={e => handleOptionLabelChange(node.id, opt.id, e.target.value)}
                  />
                  {/* Hier später: Verbindung ziehen */}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {/* Platz für Verbindungen, KI, Wissen etc. */}
    </div>
  );
};

export default GuidedDialogEditor; 