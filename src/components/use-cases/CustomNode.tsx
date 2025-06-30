import React, { memo, CSSProperties } from 'react';
import { Handle, Position } from 'reactflow';
import { AlertTriangle } from 'lucide-react';

interface CustomNodeData {
  type: 'instruction' | 'end' | 'ai_interpret' | 'agent_choice';
  label: string;
  isError?: boolean;
  issues?: string[];
}

interface CustomNodeProps {
  data: CustomNodeData;
}

const CustomNode: React.FC<CustomNodeProps> = ({ data }) => {
  const isEndNode = data.type === 'end';
  const hasError = data.isError;

  const nodeStyle: CSSProperties = {
    background: isEndNode ? '#EBF5FB' : 'white',
    border: `2px solid ${hasError ? '#EF4444' : (isEndNode ? '#3498DB' : '#ddd')}`,
    borderRadius: '8px',
    padding: '20px',
    width: '350px',
    textAlign: 'left',
    boxShadow: hasError ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 2px 5px rgba(0,0,0,0.05)',
    position: 'relative',
  };

  const headerStyle: CSSProperties = {
    fontWeight: 'bold',
    marginBottom: '8px',
    textTransform: 'capitalize',
    color: isEndNode ? '#2874A6' : '#333',
    display: 'flex',
    alignItems: 'center',
  };

  const errorIconStyle: CSSProperties = {
    marginRight: '8px',
    color: '#EF4444',
  };

  const issuesListStyle: CSSProperties = {
    marginTop: '12px',
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#DC2626',
  };

  return (
    <div style={nodeStyle}>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <div>
        <div style={headerStyle}>
          {hasError && <AlertTriangle size={18} style={errorIconStyle} />}
          {data.type}
        </div>
        <div style={{ fontSize: '14px', color: '#555', marginTop: '4px' }}>{data.label}</div>

        {hasError && data.issues && data.issues.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#B91C1C' }}>Probleme gefunden:</div>
            <ul style={issuesListStyle}>
              {data.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={!isEndNode}
        style={{ background: '#555', visibility: isEndNode ? 'hidden' : 'visible' } as CSSProperties}
      />
    </div>
  );
};

export default memo(CustomNode);
