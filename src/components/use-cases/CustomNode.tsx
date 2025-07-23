import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, Trash, CheckCircle, HelpCircle, Mail, PlayCircle, ListChecks, Pencil } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface CustomNodeData {
  label: string;
  description?: string;
  type?: string;
  onAddStep?: () => void;
  onDelete?: () => void;
}

const typeStyles: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  start: { color: '#22c55e', icon: <PlayCircle size={18} color="#22c55e" />, label: 'Start' },
  question_group: { color: '#10b981', icon: <ListChecks size={18} color="#10b981" />, label: 'Fragenblock' },
  decision: { color: '#f59e42', icon: <HelpCircle size={18} color="#f59e42" />, label: 'Entscheidung' },
  action: { color: '#a21caf', icon: <Mail size={18} color="#a21caf" />, label: 'Aktion' },
  end: { color: '#6b7280', icon: <Trash size={18} color="#6b7280" />, label: 'Ende' },
};

const CustomNode: React.FC<{ data: any }> = ({ data }) => {
  const [hovered, setHovered] = useState(false);
  const style = typeStyles[data.type || 'question_group'] || typeStyles.question_group;
  const { toast } = useToast();

  // Spezielles Layout für Start-Node
  if (data.type === 'start') {
    return (
      <div
        style={{
          background: '#22c55e',
          border: '2.5px solid #22c55e',
          borderRadius: 18,
          padding: 24,
          minWidth: 180,
          minHeight: 80,
          boxShadow: 'none',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: 1,
        }}
      >
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: '#fff',
            border: '2px solid #22c55e',
            width: 16,
            height: 16,
            right: -12,
            boxShadow: '0 0 0 2px #fff',
          }}
        />
        <PlayCircle size={32} color="#fff" style={{ marginBottom: 8 }} />
        Start
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${style.color}`,
        borderRadius: 16,
        padding: 22,
        minWidth: 240,
        minHeight: 90,
        boxShadow: hovered ? `0 6px 32px ${style.color}22` : '0 2px 8px #0001',
        position: 'relative',
        transition: 'box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: 8,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { console.log('CustomNode Root-DIV wurde geklickt', data); }}
    >
      {/* Typ-Badge */}
      {data.type && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 18,
          background: style.color,
          color: '#fff',
          borderRadius: 8,
          padding: '2px 10px',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 18, // mehr Abstand nach unten
        }}>
          {style.icon} {style.label}
        </div>
      )}
      {/* Ports */}
      <Handle type="target" position={Position.Left} style={{ background: style.color, width: 18, height: 18, left: -14, border: '2px solid red', zIndex: 20 }} />
      {/* Für alle außer decision: normaler source-Handle */}
      {data.type !== 'decision' && (
        <Handle type="source" position={Position.Right} style={{ background: style.color, width: 18, height: 18, right: -14, border: '2px solid red', zIndex: 20 }} />
      )}
      {/* Für decision: zusätzlicher allgemeiner source-Handle */}
      {data.type === 'decision' && (
        <Handle
          type="source"
          position={Position.Right}
          id="default"
          style={{ background: '#fff', border: '3px solid red', width: 24, height: 24, right: -22, top: 40, zIndex: 30 }}
          isConnectable={true}
        />
      )}
      {/* Für decision: für jede Option ein eigener source-Handle, alle eindeutig und connectable */}
      {data.type === 'decision' && Array.isArray(data.options) && data.options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, position: 'absolute', right: -40, top: 70, zIndex: 50 }}>
          {data.options.map((opt: string, i: number) => (
            <Handle
              key={opt}
              type="source"
              position={Position.Right}
              id={`option-${i}`}
              style={{ background: '#fff', border: '3px solid blue', width: 22, height: 22, marginBottom: 8, zIndex: 50 }}
              isConnectable={true}
            />
          ))}
        </div>
      )}
      <div style={{ fontWeight: 700, fontSize: 20, color: style.color, marginBottom: 2, marginTop: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        {style.icon} {data.label}
      </div>
      {/* Hinweistext */}
      {data.hint && (
        <div style={{ background: '#f1f5ff', color: style.color, borderRadius: 7, padding: '6px 10px', fontSize: 14, marginBottom: 2 }}>
          {data.hint}
        </div>
      )}
      {/* Beschreibung */}
      {data.description && <div style={{ color: '#222', fontSize: 15, marginBottom: 2 }}>{data.description}</div>}
      {/* Felder für Fragenblock */}
      {data.type === 'question_group' && Array.isArray(data.fields) && data.fields.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <b style={{ fontSize: 14, color: '#10b981' }}>Felder:</b>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.fields.map((f: any, i: number) => (
              <li key={i} style={{ fontSize: 14, color: '#222', background: '#e0f7f1', borderRadius: 5, padding: '2px 8px', display: 'inline-block' }}>{f.label}</li>
            ))}
          </ul>
        </div>
      )}
      {/* Optionen für Entscheidung */}
      {data.type === 'decision' && Array.isArray(data.options) && data.options.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <b style={{ fontSize: 14, color: '#f59e42' }}>Optionen:</b>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {data.options.map((opt: string, i: number) => (
              <div key={opt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
                <span style={{
                  background: '#fff7ed',
                  color: '#f59e42',
                  borderRadius: 5,
                  padding: '2px 10px',
                  fontSize: 14,
                  border: '1px solid #f59e42',
                  fontWeight: 600,
                  minWidth: 40,
                  textAlign: 'right',
                  marginRight: 12,
                }}>{opt}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`option-${i}`}
                  style={{ background: '#fff', border: '2px solid #f59e42', width: 18, height: 18, marginLeft: 4, zIndex: 10 }}
                  isConnectable={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Aktionsart */}
      {data.type === 'action' && data.actionType && (
        <div style={{ marginTop: 2 }}>
          <b style={{ fontSize: 14, color: '#a21caf' }}>Aktion:</b>
          <span style={{ background: '#f3e8ff', color: '#a21caf', borderRadius: 5, padding: '2px 10px', fontSize: 14, marginLeft: 6 }}>
            {data.actionType === 'wiedervorlage' && 'Wiedervorlage'}
            {data.actionType === 'email_kunde' && 'E-Mail an Kunden'}
            {data.actionType === 'email_endkunde' && 'E-Mail an Endkunden'}
            {data.actionType === 'anderes' && (data.actionCustom || 'Anderes')}
          </span>
        </div>
      )}
      {/* + Button */}
      {data.onAddStep && (
        <button
          style={{
            position: 'absolute',
            right: -28,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: hovered ? style.color : '#fff',
            color: hovered ? '#fff' : style.color,
            border: `2px solid ${style.color}`,
            boxShadow: hovered ? `0 0 16px 2px ${style.color}55` : '0 2px 6px #2563eb22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            zIndex: 10,
          }}
          title="Schritt rechts anfügen"
          onClick={e => { e.stopPropagation(); data.onAddStep && data.onAddStep(); }}
        >
          <Plus size={24} />
        </button>
      )}
      {/* Löschen-Button (nur beim Hover sichtbar) */}
      {hovered && data.onDelete && (
        <button
          style={{
            position: 'absolute',
            right: -28,
            bottom: -28,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            boxShadow: '0 2px 8px #ef444422',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
          }}
          title="Node löschen"
          onClick={e => {
            e.stopPropagation();
            if (data.onDelete) data.onDelete();
            toast({ title: 'Node wurde gelöscht!' });
          }}
        >
          <Trash size={22} />
        </button>
      )}
    </div>
  );
};

export default CustomNode;
