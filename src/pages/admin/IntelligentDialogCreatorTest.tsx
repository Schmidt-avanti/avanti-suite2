import React from 'react';
import IntelligentDialogCreator from '../../components/use-cases/IntelligentDialogCreator';

const IntelligentDialogCreatorTest: React.FC = () => {
  const handleSave = (data: any) => {
    console.log('Dialog gespeichert:', data);
    alert('Dialog gespeichert! Siehe Konsole für Details.');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Intelligent Dialog Creator - Testumgebung</h1>
      <div className="bg-white p-4 rounded-lg shadow">
        <IntelligentDialogCreator 
          onSave={handleSave}
          initialDescription=""
        />
      </div>
    </div>
  );
};

export default IntelligentDialogCreatorTest;
