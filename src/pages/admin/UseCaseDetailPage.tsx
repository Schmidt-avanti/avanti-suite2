import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCaseTypeLabels } from "@/types/use-case";
import { ChevronLeft, Edit, FileText } from "lucide-react";
import { UseCaseEditDialog } from "@/components/use-cases/UseCaseEditDialog";
import { useState } from "react";
import CreateKnowledgeArticleButton from "@/components/knowledge-articles/CreateKnowledgeArticleButton";
import { UpdateEmbeddingsButton } from "@/components/use-cases/UpdateEmbeddingsButton";

const fetchUseCase = async (id: string) => {
  const { data, error } = await supabase
    .from("use_cases")
    .select("*, knowledge_articles(id)")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return data;
};

export default function UseCaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: useCase, isLoading, error } = useQuery({
    queryKey: ["use_case", id],
    queryFn: () => fetchUseCase(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Lade Daten…</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Fehler: {(error as any).message}</div>;
  }

  if (!useCase) {
    return <div className="text-center py-4">Use Case nicht gefunden</div>;
  }

  const hasKnowledgeArticle = useCase.knowledge_articles && useCase.knowledge_articles.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/admin/use-cases")}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">
            {useCase.title}
          </h1>
        </div>
        <div className="flex gap-2">
          {!hasKnowledgeArticle && (
            <CreateKnowledgeArticleButton useCaseId={useCase.id} />
          )}
          <UpdateEmbeddingsButton useCaseId={useCase.id} />
          <Button 
            onClick={() => setIsEditDialogOpen(true)}
            className="bg-avanti-500 hover:bg-avanti-600"
          >
            <Edit className="h-4 w-4 mr-2" />
            Bearbeiten
          </Button>
        </div>
      </div>

      {hasKnowledgeArticle && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-green-700 font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Wissensartikel vorhanden
              </span>
              <Button
                variant="outline" 
                size="sm"
                className="text-green-700 border-green-300 hover:bg-green-100"
                onClick={() => navigate(`/admin/knowledge-articles/${useCase.knowledge_articles[0].id}`)}
              >
                Anzeigen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status</span>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${useCase.is_active ? "bg-green-500" : "bg-gray-300"}`} />
              {useCase.is_active ? "Aktiv" : "Inaktiv"}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Typ</span>
            <Badge variant="secondary">
              {useCaseTypeLabels[useCase.type]}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Erstellt am</span>
            <span className="text-muted-foreground">
              {new Date(useCase.created_at).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {useCase.information_needed && (
        <Card>
          <CardHeader>
            <CardTitle>Benötigte Informationen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{useCase.information_needed}</p>
          </CardContent>
        </Card>
      )}

      {useCase.expected_result && (
        <Card>
          <CardHeader>
            <CardTitle>Erwartetes Ergebnis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{useCase.expected_result}</p>
          </CardContent>
        </Card>
      )}

      {useCase.steps && (
        <Card>
          <CardHeader>
            <CardTitle>Schritte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{useCase.steps}</p>
          </CardContent>
        </Card>
      )}

      {useCase.typical_activities && (
        <Card>
          <CardHeader>
            <CardTitle>Typische Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{useCase.typical_activities}</p>
          </CardContent>
        </Card>
      )}

      <UseCaseEditDialog 
        useCase={useCase}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
