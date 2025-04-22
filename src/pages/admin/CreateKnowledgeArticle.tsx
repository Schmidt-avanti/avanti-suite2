
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import KnowledgeArticleChat from '@/components/knowledge-articles/KnowledgeArticleChat';

const CreateKnowledgeArticle = () => {
  const navigate = useNavigate();
  const { useCaseId } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/admin/use-cases/${useCaseId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">
            Neuen Wissensartikel anlegen
          </h1>
        </div>
      </div>

      <Card className="p-6">
        <KnowledgeArticleChat useCaseId={useCaseId!} />
      </Card>
    </div>
  );
};

export default CreateKnowledgeArticle;
