import React, { useCallback, useRef, useState, useEffect } from "react";
import { ReactFlow, Background, Controls, MiniMap, addEdge, applyNodeChanges, applyEdgeChanges, getBezierPath, EdgeProps, BaseEdge, Position, Node, Edge, NodeChange, EdgeChange, Connection, ReactFlowProvider } from '@xyflow/react';
import { Plus, Trash, Mail, CheckCircle, HelpCircle } from "lucide-react";
import CustomNode from "./CustomNode";
// @ts-ignore
import ELK from "elkjs/lib/elk.bundled.js";

const DUMMY_BLOCKS = [
  { id: "block-1", label: "E-Mail senden", type: "instruction" },
  { id: "block-2", label: "Daten prüfen", type: "instruction" },
  { id: "block-3", label: "Entscheidung", type: "agent_choice" },
  { id: "block-4", label: "Warten auf Antwort", type: "instruction" },
];

const paletteStyle: React.CSSProperties = {
  width: 180,
  background: "#f1f5f9",
  borderRadius: 12,
  padding: 16,
  marginRight: 16,
  minHeight: 600,
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
};

const blockStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "grab",
  fontWeight: 500,
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
};

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.2)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 28,
  minWidth: 340,
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  zIndex: 1001,
  border: "1.5px solid #e5e7eb",
};

const NODE_TYPES = [
  { type: "info", label: "Anweisung", icon: <CheckCircle size={18} color="#22c55e" /> },
  { type: "decision", label: "Entscheidung", icon: <HelpCircle size={18} color="#2563eb" /> },
  { type: "end", label: "Ende", icon: <Trash size={18} color="#6b7280" /> },
];

const nodeTypes = { custom: CustomNode };

// Custom Edge mit + Button
const CustomEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, markerEnd, style, selected, data } = props;
  const [hovered, setHovered] = React.useState(false);
  const [centerX, centerY] = [
    (sourceX + targetX) / 2,
    (sourceY + targetY) / 2
  ];
  const edgePath = getBezierPath({ sourceX, sourceY, sourcePosition: Position.Right, targetX, targetY, targetPosition: Position.Left })[0];
  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ pointerEvents: 'all' }}
    >
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {hovered && (
        <foreignObject x={centerX - 16} y={centerY - 16} width={32} height={32} style={{ overflow: 'visible' }}>
          <button
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
            }}
            title="Knoten an dieser Kante einfügen"
            onClick={e => {
              e.stopPropagation();
              if (data && data.onEdgeAddNode) data.onEdgeAddNode(id);
            }}
          >
            <Plus size={20} />
          </button>
        </foreignObject>
      )}
    </g>
  );
};

const edgeTypes = { custom: CustomEdge };

// Hilfsfunktion für eindeutige IDs
function generateNodeId(prefix = 'step') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// elkjs Layout-Hilfsfunktion (refaktoriert)
const elkLayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '60',
  'elk.spacing.nodeNode': '40',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

const elk = new ELK();
async function getElkLayoutedElements(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return { nodes: [], edges: [], elkError: false };
  }
  // IDs als String erzwingen
  const nodesStr = nodes.map(n => ({ ...n, id: String(n.id) }));
  const edgesStr = edges.map(e => ({ ...e, source: String(e.source), target: String(e.target) }));
  // ELK-Graph vorbereiten
  const elkGraph = {
    id: "root",
    layoutOptions: elkLayoutOptions,
    children: nodesStr.map((node) => ({
      id: node.id,
      width: 350,
      height: 100,
    })),
    edges: edgesStr.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
  try {
    const layout = await elk.layout(elkGraph);
    // Positionen zurückschreiben
    const nodePositions = {};
    layout.children.forEach((n) => {
      nodePositions[n.id] = { x: n.x, y: n.y };
    });
    const layoutedNodes = nodesStr.map((node) => ({
      ...node,
      position: nodePositions[node.id] || { x: 0, y: 0 },
      sourcePosition: "bottom",
      targetPosition: "top",
    }));
    return { nodes: layoutedNodes, edges: edgesStr, elkError: false };
  } catch (err) {
    console.error("ELK-Layout-Fehler:", err);
    // Fallback: einfache vertikale Anordnung
    return {
      nodes: nodesStr.map((node, i) => ({
        ...node,
        position: { x: 100, y: 100 + i * 150 },
        sourcePosition: "bottom",
        targetPosition: "top",
      })),
      edges: edgesStr,
      elkError: true,
    };
  }
}

// Hilfsfunktion für Templates
function getTemplateNodesAndEdges(templateType: string) {
  switch (templateType) {
    case 'wissensanfrage':
      return {
        nodes: [
          { id: 'start', type: 'input', data: { label: 'Start' }, position: { x: 100, y: 100 }, sourcePosition: Position.Right },
          { id: 'info', data: { label: 'Informationen aufnehmen', type: 'info' }, position: { x: 300, y: 100 } },
          { id: 'antwort', data: { label: 'Antwort geben', type: 'info' }, position: { x: 500, y: 100 } },
          { id: 'end', type: 'output', data: { label: 'Ende' }, position: { x: 700, y: 100 }, targetPosition: Position.Left },
        ],
        edges: [
          { id: 'e-start-info', source: 'start', target: 'info', type: 'smoothstep' },
          { id: 'e-info-antwort', source: 'info', target: 'antwort', type: 'smoothstep' },
          { id: 'e-antwort-end', source: 'antwort', target: 'end', type: 'smoothstep' },
        ]
      };
    case 'weiterleitung':
      return {
        nodes: [
          { id: 'start', type: 'input', data: { label: 'Start' }, position: { x: 300, y: 50 } },
          { id: 'info', data: { label: 'Informationen aufnehmen', type: 'info' }, position: { x: 300, y: 200 } },
          { id: 'weiterleiten', data: { label: 'Weiterleiten an Fachabteilung', type: 'info' }, position: { x: 300, y: 350 } },
          { id: 'end', type: 'output', data: { label: 'Ende' }, position: { x: 300, y: 500 } },
        ],
        edges: [
          { id: 'e-start-info', source: 'start', target: 'info', type: 'smoothstep' },
          { id: 'e-info-weiterleiten', source: 'info', target: 'weiterleiten', type: 'smoothstep' },
          { id: 'e-weiterleiten-end', source: 'weiterleiten', target: 'end', type: 'smoothstep' },
        ]
      };
    case 'direktbearbeitung':
      return {
        nodes: [
          { id: 'start', type: 'input', data: { label: 'Start' }, position: { x: 300, y: 50 } },
          { id: 'schritt1', data: { label: 'Schritt 1 durchführen', type: 'info' }, position: { x: 300, y: 170 } },
          { id: 'schritt2', data: { label: 'Schritt 2 durchführen', type: 'info' }, position: { x: 300, y: 290 } },
          { id: 'schritt3', data: { label: 'Schritt 3 durchführen', type: 'info' }, position: { x: 300, y: 410 } },
          { id: 'end', type: 'output', data: { label: 'Ende' }, position: { x: 300, y: 530 } },
        ],
        edges: [
          { id: 'e-start-1', source: 'start', target: 'schritt1', type: 'smoothstep' },
          { id: 'e-1-2', source: 'schritt1', target: 'schritt2', type: 'smoothstep' },
          { id: 'e-2-3', source: 'schritt2', target: 'schritt3', type: 'smoothstep' },
          { id: 'e-3-end', source: 'schritt3', target: 'end', type: 'smoothstep' },
        ]
      };
    case 'individuell':
    default:
      return {
        nodes: [
          { id: 'start', type: 'input', data: { label: 'Start' }, position: { x: 100, y: 100 }, sourcePosition: Position.Right },
          { id: 'end', type: 'output', data: { label: 'Ende' }, position: { x: 700, y: 100 }, targetPosition: Position.Left },
        ],
        edges: [
          { id: 'e-start-end', source: 'start', target: 'end', type: 'smoothstep' },
        ]
      };
  }
}

const UseCaseProcessEditor: React.FC = () => {
  const templateType = (typeof window !== 'undefined' && (window as any).USECASE_TEMPLATE_TYPE) || 'wissensanfrage';
  const { nodes: initialNodesT, edges: initialEdgesT } = getTemplateNodesAndEdges(templateType);
  const [nodes, setNodes] = useState<Node[]>(initialNodesT);
  const [edges, setEdges] = useState<Edge[]>(initialEdgesT);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [addNodeParent, setAddNodeParent] = useState<Node | null>(null);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [selectedType, setSelectedType] = useState(NODE_TYPES[0].type);
  const [addNodeEdgeId, setAddNodeEdgeId] = useState<string | null>(null);
  const [addNodePort, setAddNodePort] = useState<string | null>(null);

  // Layout mit elkjs (async) wieder aktivieren
  const [rfNodes, setRfNodes] = useState(nodes);
  const [rfEdges, setRfEdges] = useState(edges);
  const [elkError, setElkError] = useState(false);
  useEffect(() => {
    getElkLayoutedElements(nodes, edges).then((layouted) => {
      setRfNodes(layouted.nodes.map((node) => ({
        ...node,
        type: getNodeType(node),
        data: {
          ...node.data,
          onAddStep: (port) => handleAddStep(node),
          onDelete: () => handleDeleteNode(node),
        },
      })));
      setRfEdges(layouted.edges);
      setElkError(layouted.elkError);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(nodes), JSON.stringify(edges)]);

  // Callback für Edge-Button (nach oben verschoben)
  const handleEdgeAddNode = useCallback((edgeId: string) => {
    setAddNodeEdgeId(edgeId);
    setShowTypeDialog(true);
    setSelectedType(NODE_TYPES[0].type);
  }, []);

  // edges für ReactFlow vorbereiten: immer data.onEdgeAddNode setzen, type: 'smoothstep'
  const rfEdgesWithData = rfEdges.map(e => ({ ...e, type: 'smoothstep', data: { onEdgeAddNode: handleEdgeAddNode } }));

  // Drag & Drop Handler für die Palette
  const onDragStart = (event: React.DragEvent, block: any) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(block));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowInstance || !reactFlowWrapper.current) return;
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;
      const block = JSON.parse(data);
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const newNode: Node = {
        id: `${block.id}-${+new Date()}`,
        type: "custom",
        position: { x: position.x + 30, y: position.y + 30 },
        data: { label: block.label, description: "", type: block.type },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  // Korrekte Handler für React Flow
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);
  const handleConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, []);

  // Knoten-Klick: Bearbeitungsdialog öffnen
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setEditLabel(node.data.label || "");
    setEditDescription(node.data.description || "");
  }, []);

  // Speichern im Dialog
  const handleSaveNode = () => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, label: editLabel, description: editDescription } }
          : n
      )
    );
    setSelectedNode(null);
  };

  // Hilfsfunktion: Node-Typ bestimmen
  const getNodeType = (node) => {
    if (node.type === "input") return "input";
    if (node.type === "output") return "output";
    return "custom";
  };

  // Callbacks für CustomNode (stabil mit useCallback)
  const handleAddStep = useCallback((parentNode) => {
    setAddNodeParent(parentNode);
    setShowTypeDialog(true);
    setSelectedType(NODE_TYPES[0].type);
  }, []);
  const handleDeleteNode = useCallback((node) => {
    setNodes((nds) => nds.filter((n) => n.id !== node.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== node.id && edge.target !== node.id));
  }, []);

  // Hilfsfunktion: Knoten an Port hinzufügen
  const handleAddNodeAtPort = () => {
    if (!addNodeParent) return;
    const parentId = addNodeParent.id;
    const newId = generateNodeId();
    // Position des Parent-Knotens holen
    const parentPos = addNodeParent.position || { x: 0, y: 0 };
    const newPos = { x: parentPos.x + 400, y: parentPos.y };
    const newNode = {
      id: newId,
      type: "default",
      position: newPos,
      data: { label: "Neuer Schritt", description: "", type: selectedType },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
    // Neue Kante von parentId zu neuem Knoten
    const newEdges = [
      ...edges,
      { id: `e-${parentId}-right-${newId}`, source: parentId, target: newId, type: "custom", data: { onEdgeAddNode: handleEdgeAddNode } },
    ];
    setNodes(nds => [...nds, newNode]);
    setEdges(newEdges);
    setShowTypeDialog(false);
    setAddNodeParent(null);
  };

  // Kante löschen
  const onEdgeClick = (evt, edge) => {
    evt.stopPropagation();
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  };

  return (
    <ReactFlowProvider>
      <div style={{color:'red',fontWeight:700,fontSize:20,position:'absolute',top:10,left:10,zIndex:9999,background:'#fff',padding:8,borderRadius:6,boxShadow:'0 2px 8px #0002'}}>TEST: Diese Zeile wurde von der KI in UseCaseProcessEditor.tsx eingefügt.</div>
      <div style={{ display: "flex", width: "100%", minHeight: 600 }}>
        <div style={paletteStyle}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Katalog-Bausteine</div>
          {DUMMY_BLOCKS.map((block) => (
            <div
              key={block.id}
              style={blockStyle}
              draggable
              onDragStart={(e) => onDragStart(e, block)}
            >
              {block.label}
            </div>
          ))}
        </div>
        <div
          ref={reactFlowWrapper}
          style={{ flex: 1, minHeight: 600, height: "70vh", background: "#f8fafc", borderRadius: 12, position: 'relative' }}
        >
          <button
            style={{position:'absolute',top:30,left:30,zIndex:10000,padding:'12px 24px',background:'#2563eb',color:'#fff',fontWeight:700,border:'none',borderRadius:8,boxShadow:'0 2px 8px #2563eb44',cursor:'pointer'}}
            onClick={() => alert('Canvas-Event!')}
          >
            TEST: Canvas-Event
          </button>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdgesWithData}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            fitView
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={true}
            elementsSelectable={true}
            nodesConnectable={true}
            edgesFocusable={true}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
          >
            <MiniMap />
            <Controls />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
          {/* Typauswahl-Dialog */}
          {showTypeDialog && (
            <div style={modalBackdrop} onClick={() => setShowTypeDialog(false)}>
              <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 20, color: '#111827' }}>Knotentyp wählen</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                  {NODE_TYPES.map((t) => (
                    <label key={t.type} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 17, fontWeight: 500, color: '#222' }}>
                      <input
                        type="radio"
                        name="node-type"
                        value={t.type}
                        checked={selectedType === t.type}
                        onChange={() => setSelectedType(t.type)}
                        style={{ accentColor: t.type === 'info' ? '#22c55e' : t.type === 'decision' ? '#2563eb' : '#6b7280', width: 18, height: 18 }}
                      />
                      {t.icon} {t.label}
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button onClick={() => setShowTypeDialog(false)} style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: "#f3f4f6", color: "#222", fontWeight: 500, fontSize: 16 }}>Abbrechen</button>
                  <button onClick={addNodeParent ? handleAddNodeAtPort : () => {}} style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, fontSize: 16 }}>Hinzufügen</button>
                </div>
              </div>
            </div>
          )}
          {selectedNode && (
            <div style={modalBackdrop} onClick={() => setSelectedNode(null)}>
              <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Schritt bearbeiten</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>Name</label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>Beschreibung</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    style={{ width: "100%", minHeight: 60, padding: 6, borderRadius: 6, border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button onClick={() => setSelectedNode(null)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#e5e7eb" }}>Abbrechen</button>
                  <button onClick={handleSaveNode} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontWeight: 500 }}>Speichern</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default UseCaseProcessEditor; 