import React, { useMemo, useEffect, useState } from 'react';
import dagre from 'dagre'; // Note: Add 'dagre' and '@types/dagre' to package.json
import CustomNode from './CustomNode';
import ReactFlow, { MiniMap, Controls, Background, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { ProcessMap, ProcessStep, ValidationResult } from '../../types/process';

interface ProcessMapVisualizationProps {
  processMap: ProcessMap | null;
  validationResult?: ValidationResult;
}

const ProcessMapVisualization: React.FC<ProcessMapVisualizationProps> = ({ processMap, validationResult }) => {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const [usingFallbackLayout, setUsingFallbackLayout] = useState(false);
  
  // Attempt to use Dagre for layout, but with error handling
  const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    try {
      console.log('Attempting Dagre layout...');
      const g = new dagre.graphlib.Graph();
      g.setGraph({ 
        rankdir: 'LR',
        ranksep: 300,       // Erhöhter horizontaler Abstand für mehr Platz zwischen Spalten
        nodesep: 150,       // Erhöhter vertikaler Abstand für mehr Platz zwischen Zeilen
        edgesep: 150,       // Größerer Abstand zwischen Kanten
        marginx: 50,        // Rand an den Seiten
        marginy: 50,        // Rand oben/unten
        acyclicer: 'greedy' // Verbessert das Layout für Zyklen
      });
      const nodeIds = new Set(nodes.map(n => n.id));

      // Force defensive copy of nodes and edges to prevent Dagre from mutating our original data
      const nodesCopy = [...nodes];
      const edgesCopy = [...edges];

      // Set up nodes in Dagre graph
      nodesCopy.forEach((node) => {
        g.setNode(node.id, { label: node.data.label, width: 350, height: 150 });
      });

      // Set up edges in Dagre graph
      edgesCopy.forEach((edge) => {
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
          g.setEdge(edge.source, edge.target, { points: [] });
        }
      });

      // Try the layout - this is where Dagre often crashes
      try {
        dagre.layout(g);
      } catch (layoutError) {
        console.error('Dagre layout crashed, using fallback layout:', layoutError);
        setUsingFallbackLayout(true);
        return getFallbackLayout(nodes, edges);
      }

      // Convert Dagre's layout back to ReactFlow format
      const layoutedNodes = nodesCopy.map((node) => {
        const nodeWithPosition = g.node(node.id);
        if (nodeWithPosition && typeof nodeWithPosition.x === 'number' && typeof nodeWithPosition.y === 'number') {
          node.position = {
            x: nodeWithPosition.x - 175,
            y: nodeWithPosition.y - 75,
          };
        } else {
          // Dagre failed to position this node properly
          console.warn(`Dagre failed to position node ${node.id}, using fallback position`);
          // We'll keep the node's current position or set a default
          if (!node.position || (node.position.x === 0 && node.position.y === 0)) {
            node.position = { x: 100, y: 100 }; // Default position
          }
        }
        return node;
      });

      return { nodes: layoutedNodes, edges };
    } catch (error) {
      // If Dagre fails completely, use our fallback layout
      console.error('Error in Dagre layout, using fallback:', error);
      setUsingFallbackLayout(true);
      return getFallbackLayout(nodes, edges);
    }
  };

  // Fallback layout algorithm when Dagre fails
  // Places nodes in a simple tree structure from left to right
  const getFallbackLayout = (nodes: Node[], edges: Edge[]) => {
    console.log('Using fallback layout algorithm');
    
    // Get all node IDs for quick lookup
    const nodeIds = new Set(nodes.map(n => n.id));
    
    // Find entry points (nodes with no incoming edges)
    const nodeIncomingEdges = new Map<string, number>();
    nodes.forEach(node => nodeIncomingEdges.set(node.id, 0));
    
    edges.forEach(edge => {
      if (nodeIds.has(edge.target)) {
        const count = nodeIncomingEdges.get(edge.target) || 0;
        nodeIncomingEdges.set(edge.target, count + 1);
      }
    });
    
    // Nodes with no incoming edges are entry points
    const entryPointIds = Array.from(nodeIncomingEdges.entries())
      .filter(([_, count]) => count === 0)
      .map(([id]) => id);
    
    // If no entry points found, just use the first node
    const startNodes = entryPointIds.length > 0 ? entryPointIds : nodes.length > 0 ? [nodes[0].id] : [];
    
    // Create a graph representation for traversal
    const graph = new Map<string, string[]>();
    nodes.forEach(node => graph.set(node.id, []));
    edges.forEach(edge => {
      const targets = graph.get(edge.source) || [];
      targets.push(edge.target);
      graph.set(edge.source, targets);
    });
    
    // Assign levels to nodes using BFS
    const nodeLevels = new Map<string, number>();
    const levelNodes = new Map<number, string[]>();
    
    let currentLevel = 0;
    let current = startNodes;
    let next: string[] = [];
    
    while (current.length > 0) {
      levelNodes.set(currentLevel, [...current]);
      
      current.forEach(nodeId => {
        nodeLevels.set(nodeId, currentLevel);
        const targets = graph.get(nodeId) || [];
        next.push(...targets.filter(target => !nodeLevels.has(target)));
      });
      
      current = next;
      next = [];
      currentLevel++;
    }
    
    // Handle any orphaned nodes (not reachable from entry points)
    nodes.forEach(node => {
      if (!nodeLevels.has(node.id)) {
        const orphanLevel = currentLevel;
        nodeLevels.set(node.id, orphanLevel);
        const levelNodeList = levelNodes.get(orphanLevel) || [];
        levelNodeList.push(node.id);
        levelNodes.set(orphanLevel, levelNodeList);
        currentLevel++;
      }
    });
    
    // Position nodes based on their levels
    const xSpacing = 400;
    const ySpacing = 200;
    const layoutedNodes = nodes.map(node => {
      const level = nodeLevels.get(node.id) || 0;
      const nodesInLevel = levelNodes.get(level) || [];
      const indexInLevel = nodesInLevel.indexOf(node.id);
      
      // Position horizontally by level, vertically by index in level
      const x = level * xSpacing + 100;
      const y = indexInLevel * ySpacing + 100;
      
      return {
        ...node,
        position: { x, y }
      };
    });
    
    return { nodes: layoutedNodes, edges };
  };

  const { nodes, edges } = useMemo(() => {
    if (!processMap || !processMap.steps) {
      return { nodes: [], edges: [] };
    }

    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // Robustly handle steps whether it's an array or an object
    const stepsAsArray: ProcessStep[] = Array.isArray(processMap.steps)
      ? processMap.steps
      : Object.values(processMap.steps);

    const validSteps = stepsAsArray.filter(step => step && step.id && step.id.trim() !== '');
    const nodeIds = new Set(validSteps.map(step => step.id));

    // First pass: create nodes
    validSteps.forEach((stepDetails) => {
      const stepIssues = validationResult?.stepIssues?.find(issue => issue.stepId === stepDetails.id);
      const isError = !!stepIssues;

      initialNodes.push({
        id: stepDetails.id,
        type: 'custom',
        data: {
          label: stepDetails.text_to_agent || `[Schritt ohne Text: ${stepDetails.id}]`,
          type: stepDetails.type,
          isError: isError,
          issues: stepIssues?.issues || [],
        },
        position: { x: 0, y: 0 },
        className: isError ? 'border-red-500 shadow-lg shadow-red-500/50' : ''
      });
    });

    // Second pass: create edges
    validSteps.forEach((stepDetails, index) => {
      let edgeCreated = false;

      // Priority 1: Use explicit next_step_id if available
      if (stepDetails.next_step_id && nodeIds.has(stepDetails.next_step_id)) {
        initialEdges.push({
          id: `e-${stepDetails.id}-${stepDetails.next_step_id}`,
          source: stepDetails.id,
          target: stepDetails.next_step_id,
          animated: true,
        });
        edgeCreated = true;
      }

      // Priority 2: Handle branching logic
      if ((stepDetails.type === 'agent_choice' || stepDetails.type === 'ai_interpret') && stepDetails.possible_outcomes) {
        stepDetails.possible_outcomes.forEach(outcome => {
          if (outcome.next_step_id && nodeIds.has(outcome.next_step_id)) {
            initialEdges.push({
              id: `e-${stepDetails.id}-${outcome.next_step_id}`,
              source: stepDetails.id,
              target: outcome.next_step_id,
              label: outcome.label,
              animated: true,
            });
          }
        });
        edgeCreated = true;
      }

      // Fallback for linear arrays without explicit connections
      if (!edgeCreated && Array.isArray(processMap.steps) && index < validSteps.length - 1) {
        const nextStep = validSteps[index + 1];
        if (nextStep) {
            initialEdges.push({
                id: `e-${stepDetails.id}-${nextStep.id}`,
                source: stepDetails.id,
                target: nextStep.id,
                animated: true,
            });
        }
      }
    });

    console.log('--- ProcessMapVisualization ---');
    console.log('Nodes to be layouted:', JSON.stringify(initialNodes, null, 2));
    console.log('Edges to be layouted:', JSON.stringify(initialEdges, null, 2));
    
    // Try to layout with Dagre, but fall back to our simple layout if it fails
    try {
      return getLayoutedElements(initialNodes, initialEdges);
    } catch (error) {
      console.error('Fatal layout error, using emergency fallback:', error);
      setUsingFallbackLayout(true);
      return getFallbackLayout(initialNodes, initialEdges);
    }
  }, [processMap, validationResult]);

  if (!processMap || nodes.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 p-4 border rounded-2xl shadow-md">
      <h3 className="text-lg font-medium mb-4">
        Prozess Visualisierung
        {usingFallbackLayout && (
          <span className="ml-2 text-sm text-yellow-600">(Fallback-Ansicht)</span>
        )}
      </h3>
      <div style={{ height: '500px', width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};

export default ProcessMapVisualization;
