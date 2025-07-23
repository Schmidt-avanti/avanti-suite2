// Zentrale Mapping-Funktion für Use Case Nodes (KI oder manuell)
import { Node, Position } from '@xyflow/react';

export function mapToFlowNodes(rawNodes: any[]): Node[] {
  return rawNodes.map((n, idx) => {
    const id = n.id || `node-${idx}`;
    const type = 'custom';
    const position = n.position || { x: 100 + idx * 220, y: 100 };
    const data: any = {
      ...n,
      type: n.type || 'info',
      label: n.label || n.title || `Node ${idx + 1}`,
      options: Array.isArray(n.options) ? n.options : [],
      fields: Array.isArray(n.fields) ? n.fields : [],
    };
    // Für decision-Nodes: Optionen prüfen
    if (data.type === 'decision' && data.options.length === 0) {
      data.options = ['Ja', 'Nein'];
    }
    return {
      id,
      type,
      position,
      data,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
} 