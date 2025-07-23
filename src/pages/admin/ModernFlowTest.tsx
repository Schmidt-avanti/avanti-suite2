import React from 'react';
import ModernGuidedDialogEditor from '../../components/use-cases/ModernGuidedDialogEditor';

const ModernFlowTest: React.FC = () => {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Guided Dialog Editor – Modern</h2>
      <ModernGuidedDialogEditor />
    </div>
  );
};

export default ModernFlowTest; 