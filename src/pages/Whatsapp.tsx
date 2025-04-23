
import React from "react";
import { MessageSquare } from "lucide-react";

const WhatsappPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center py-8">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-green-100 rounded-full p-4 mb-2">
          <MessageSquare className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-800">WhatsApp Integration</h1>
        <p className="text-base text-gray-600 max-w-lg">
          Hier kannst du in Zukunft alle angebundenen WhatsApp-Chats verschiedener Firmen zentral einsehen und beantworten.
        </p>
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-soft p-8 min-h-[120px] flex items-center justify-center w-full max-w-md">
          <span className="text-gray-400">Noch keine Chats verbunden.<br/>Integration & Chat-Übersicht folgen.</span>
        </div>
      </div>
    </div>
  );
};
export default WhatsappPage;
